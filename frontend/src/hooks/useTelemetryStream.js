import { useState, useEffect, useRef, useCallback } from 'react';
import { telemetryApi, API_BASE_URL } from '../services/api';

/**
 * Custom hook for resilient, authenticated IoT SSE Telemetry Streaming.
 * Follows the Spring Boot single-use stream ticket protocol:
 * 1. Authenticate with Bearer token via POST /api/v1/iot/telemetry/stream/ticket.
 * 2. Connect to GET /api/v1/iot/telemetry/stream?ticket=<ticket>.
 * 3. Never expose JWT in URL query parameters.
 * 4. Request fresh ticket on every reconnection.
 * 5. Clean up EventSource on unmount / logout.
 */
export function useTelemetryStream(options = {}) {
  const {
    machineCode = null,
    unit = null,
    onTelemetry = null,
    onAnomaly = null,
    onStatusChange = null,
    enabled = true,
  } = options;

  const [connectionStatus, setConnectionStatus] = useState('DISCONNECTED'); // 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR'
  const [lastEvent, setLastEvent] = useState(null);
  const [lastError, setLastError] = useState(null);

  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);
  const connectFnRef = useRef(null);

  // Store latest callbacks in refs to avoid re-triggering connection on function identity changes
  const onTelemetryRef = useRef(onTelemetry);
  const onAnomalyRef = useRef(onAnomaly);
  const onStatusChangeRef = useRef(onStatusChange);

  useEffect(() => {
    onTelemetryRef.current = onTelemetry;
    onAnomalyRef.current = onAnomaly;
    onStatusChangeRef.current = onStatusChange;
  }, [onTelemetry, onAnomaly, onStatusChange]);

  const closeStream = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const connectStream = useCallback(async () => {
    // Ensure existing connection is closed first
    closeStream();

    const token = localStorage.getItem('stockai_token');
    if (!enabled || !token) {
      if (isMountedRef.current) {
        setConnectionStatus('DISCONNECTED');
      }
      return;
    }

    if (isMountedRef.current) {
      setConnectionStatus('CONNECTING');
      setLastError(null);
    }

    try {
      // 1. Obtain ephemeral single-use stream ticket via Bearer-authenticated POST
      const ticketRes = await telemetryApi.getStreamTicket();
      const ticket = ticketRes?.data?.ticket;

      if (!ticket) {
        throw new Error('No stream ticket returned by telemetry server.');
      }

      if (!isMountedRef.current) return;

      // 2. Build SSE URL with single-use ticket and optional filters
      const params = new URLSearchParams({ ticket });
      if (machineCode) params.append('machineCode', machineCode);
      if (unit) params.append('unit', unit);

      const sseUrl = `${API_BASE_URL}/iot/telemetry/stream?${params.toString()}`;
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.addEventListener('CONNECTED', (e) => {
        if (!isMountedRef.current) return;
        setConnectionStatus('CONNECTED');
        reconnectAttemptsRef.current = 0; // Reset backoff on successful handshake
        try {
          const payload = JSON.parse(e.data);
          setLastEvent({ type: 'CONNECTED', data: payload });
        } catch {
          setLastEvent({ type: 'CONNECTED', data: e.data });
        }
      });

      es.addEventListener('TELEMETRY_INGESTED', (e) => {
        if (!isMountedRef.current) return;
        try {
          const payload = JSON.parse(e.data);
          setLastEvent({ type: 'TELEMETRY_INGESTED', data: payload });
          if (onTelemetryRef.current) {
            onTelemetryRef.current(payload);
          }
        } catch (err) {
          console.error('[SSE] Failed to parse TELEMETRY_INGESTED payload:', err);
        }
      });

      es.addEventListener('ANOMALY_DETECTED', (e) => {
        if (!isMountedRef.current) return;
        try {
          const payload = JSON.parse(e.data);
          setLastEvent({ type: 'ANOMALY_DETECTED', data: payload });
          if (onAnomalyRef.current) {
            onAnomalyRef.current(payload);
          }
        } catch (err) {
          console.error('[SSE] Failed to parse ANOMALY_DETECTED payload:', err);
        }
      });

      es.addEventListener('MACHINE_STATUS_CHANGED', (e) => {
        if (!isMountedRef.current) return;
        try {
          const payload = JSON.parse(e.data);
          setLastEvent({ type: 'MACHINE_STATUS_CHANGED', data: payload });
          if (onStatusChangeRef.current) {
            onStatusChangeRef.current(payload);
          }
        } catch (err) {
          console.error('[SSE] Failed to parse MACHINE_STATUS_CHANGED payload:', err);
        }
      });

      es.onmessage = (e) => {
        if (!isMountedRef.current) return;
        try {
          const payload = JSON.parse(e.data);
          setLastEvent({ type: 'MESSAGE', data: payload });
        } catch {
          setLastEvent({ type: 'MESSAGE', data: e.data });
        }
      };

      es.onerror = (err) => {
        if (!isMountedRef.current) return;
        console.warn('[SSE] Telemetry stream disconnected or errored:', err);
        closeStream();
        setConnectionStatus('ERROR');
        setLastError('Stream connection lost. Reconnecting with fresh ticket...');

        // Schedule reconnection with exponential backoff (2s, 4s, 8s, max 30s)
        const delay = Math.min(2000 * Math.pow(1.5, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current += 1;
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current && connectFnRef.current) {
            connectFnRef.current();
          }
        }, delay);
      };

    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('[SSE] Failed to acquire stream ticket:', err);
      setConnectionStatus('ERROR');
      setLastError(err.response?.data?.message || err.message || 'Failed to acquire stream ticket');

      // Retry ticket acquisition after backoff
      const delay = Math.min(3000 * Math.pow(1.5, reconnectAttemptsRef.current), 30000);
      reconnectAttemptsRef.current += 1;
      reconnectTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && connectFnRef.current) {
          connectFnRef.current();
        }
      }, delay);
    }
  }, [closeStream, enabled, machineCode, unit]);

  useEffect(() => {
    connectFnRef.current = connectStream;
  }, [connectStream]);

  useEffect(() => {
    isMountedRef.current = true;
    if (enabled) {
      connectStream();
    } else {
      closeStream();
    }

    return () => {
      isMountedRef.current = false;
      closeStream();
    };
  }, [enabled, connectStream, closeStream]);

  return {
    isConnected: connectionStatus === 'CONNECTED',
    connectionStatus,
    lastEvent,
    lastError,
    reconnect: connectStream,
  };
}

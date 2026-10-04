package com.svp.stockai.service;

import com.svp.stockai.dto.TelemetryStreamEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Slf4j
@Service
public class IoTTelemetryStreamingService {

    // 30 minutes default timeout for persistent SSE monitoring dashboards
    private static final Long DEFAULT_TIMEOUT = 30 * 60 * 1000L;

    private final Map<String, StreamClient> activeClients = new ConcurrentHashMap<>();
    private final ExecutorService broadcastExecutor = Executors.newVirtualThreadPerTaskExecutor();

    @PreDestroy
    public void shutdown() {
        try {
            broadcastExecutor.shutdown();
        } catch (Exception e) {
            log.warn("Error shutting down SSE broadcast executor: {}", e.getMessage());
        }
    }

    public SseEmitter createStream(String machineCodeFilter, String unitFilter) {

        String clientId = UUID.randomUUID().toString();
        SseEmitter emitter = new SseEmitter(DEFAULT_TIMEOUT);

        StreamClient client = new StreamClient(clientId, emitter, machineCodeFilter, unitFilter);
        activeClients.put(clientId, client);

        emitter.onCompletion(() -> {
            log.debug("SSE stream completed for client: {}", clientId);
            activeClients.remove(clientId);
        });

        emitter.onTimeout(() -> {
            log.debug("SSE stream timed out for client: {}", clientId);
            activeClients.remove(clientId);
        });

        emitter.onError(ex -> {
            log.debug("SSE stream error for client: {} - {}", clientId, ex.getMessage());
            activeClients.remove(clientId);
        });

        // Send initial connection handshake event
        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .id(clientId)
                    .data("{\"status\":\"CONNECTED\",\"clientId\":\"" + clientId + "\"}", MediaType.APPLICATION_JSON));
        } catch (IOException e) {
            log.warn("Failed to send initial handshake to SSE client: {}", clientId);
            activeClients.remove(clientId);
        }

        return emitter;
    }

    public void broadcast(TelemetryStreamEvent event) {
        if (event == null || event.getTelemetry() == null || activeClients.isEmpty()) {
            return;
        }

        broadcastExecutor.submit(() -> doBroadcast(event));
    }

    private void doBroadcast(TelemetryStreamEvent event) {
        String eventMachine = event.getTelemetry().getMachineCode();
        String eventUnit = event.getTelemetry().getUnit();

        for (Map.Entry<String, StreamClient> entry : activeClients.entrySet()) {
            StreamClient client = entry.getValue();
            if (client.matches(eventMachine, eventUnit)) {
                try {
                    client.emitter.send(SseEmitter.event()
                            .name(event.getEventType())
                            .id(event.getEventId())
                            .data(event, MediaType.APPLICATION_JSON));
                } catch (Exception e) {
                    log.debug("Removing disconnected SSE client: {}", client.clientId);
                    activeClients.remove(entry.getKey());
                }
            }
        }
    }

    public int getActiveClientCount() {
        return activeClients.size();
    }

    public void removeClient(String clientId) {
        activeClients.remove(clientId);
    }

    private static class StreamClient {
        private final String clientId;
        private final SseEmitter emitter;
        private final String machineCodeFilter;
        private final String unitFilter;

        public StreamClient(String clientId, SseEmitter emitter, String machineCodeFilter, String unitFilter) {
            this.clientId = clientId;
            this.emitter = emitter;
            this.machineCodeFilter = (machineCodeFilter != null && !machineCodeFilter.isBlank()) ? machineCodeFilter.trim() : null;
            this.unitFilter = (unitFilter != null && !unitFilter.isBlank()) ? unitFilter.trim() : null;
        }

        public boolean matches(String machineCode, String unit) {
            if (machineCodeFilter != null && !machineCodeFilter.equalsIgnoreCase(machineCode)) {
                return false;
            }
            if (unitFilter != null && !unitFilter.equalsIgnoreCase(unit)) {
                return false;
            }
            return true;
        }
    }
}

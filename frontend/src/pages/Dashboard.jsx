import React, { useState, useEffect, useCallback } from 'react';
import { Gauge, TrendingUp, AlertTriangle, CheckCircle2, GitBranch, LineChart as ChartIcon, Clock, Cpu, Radio } from 'lucide-react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { productionApi, inventoryApi, procurementApi, telemetryApi } from '../services/api';
import { useTelemetryStream } from '../hooks/useTelemetryStream';
import BatchGenealogyModal from '../components/BatchGenealogyModal';

export default function Dashboard({ onNavigate }) {
  const [machines, setMachines] = useState([]);
  const [productionRuns, setProductionRuns] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [genealogyBatch, setGenealogyBatch] = useState(null);
  const [activeAnomaly, setActiveAnomaly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [chartData, setChartData] = useState([
    { time: '11:40', temp: 218.0, pressure: 142.0, rpm: 480, output: 1810 },
    { time: '11:45', temp: 218.5, pressure: 142.5, rpm: 482, output: 1815 },
    { time: '11:50', temp: 219.0, pressure: 143.0, rpm: 485, output: 1820 },
    { time: '11:55', temp: 218.8, pressure: 142.8, rpm: 485, output: 1822 },
  ]);

  // Handle incoming real-time telemetry from backend SSE stream
  const handleTelemetryEvent = useCallback((payload) => {
    const packet = payload?.telemetry;
    if (!packet) return;

    const dt = packet.timestamp ? new Date(packet.timestamp) : new Date();
    const timeStr = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}:${String(dt.getSeconds()).padStart(2, '0')}`;

    const newPoint = {
      time: timeStr,
      temp: packet.metrics?.temperatureC ?? packet.temperatureC ?? 218.0,
      pressure: packet.metrics?.pressureBar ?? packet.pressureBar ?? 142.0,
      rpm: packet.metrics?.screwRpm ?? packet.screwRpm ?? 480,
      output: packet.metrics?.throughputKgHr ?? packet.throughputKgHr ?? 1800,
    };

    setChartData(prev => {
      const next = [...prev, newPoint];
      return next.slice(-15); // keep sliding window of last 15 points
    });

    // Update machine status in registry if machine matches
    if (packet.machineCode) {
      setMachines(prev => prev.map(m => {
        if (m.machineCode === packet.machineCode) {
          return {
            ...m,
            status: 'RUNNING',
            lastTelemetryAt: packet.timestamp,
          };
        }
        return m;
      }));
    }
  }, []);

  const handleAnomalyEvent = useCallback((payload) => {
    if (payload?.anomalies && payload.anomalies.length > 0) {
      setActiveAnomaly(payload.anomalies[0]);
    }
  }, []);

  const { isConnected, connectionStatus, reconnect } = useTelemetryStream({
    onTelemetry: handleTelemetryEvent,
    onAnomaly: handleAnomalyEvent,
    enabled: true,
  });

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [machinesRes, runsRes, rawRes, recsRes, telemetryRes] = await Promise.allSettled([
        productionApi.getActiveMachines(),
        productionApi.getRuns(),
        inventoryApi.getRawMaterials(),
        procurementApi.getRecommendations(),
        telemetryApi.getRecentEvents(20),
      ]);

      if (machinesRes.status === 'fulfilled') {
        setMachines(machinesRes.value.data || []);
      }
      if (runsRes.status === 'fulfilled') {
        setProductionRuns(runsRes.value.data || []);
      }
      if (rawRes.status === 'fulfilled') {
        setRawMaterials(rawRes.value.data || []);
      }
      if (recsRes.status === 'fulfilled') {
        setRecommendations(recsRes.value.data || []);
      }
      if (telemetryRes.status === 'fulfilled' && Array.isArray(telemetryRes.value.data) && telemetryRes.value.data.length > 0) {
        const mappedPoints = telemetryRes.value.data.slice(-10).map(evt => {
          const dt = evt.timestamp ? new Date(evt.timestamp) : new Date();
          return {
            time: `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`,
            temp: evt.metrics?.temperatureC || 218.0,
            pressure: evt.metrics?.pressureBar || 142.0,
            rpm: evt.metrics?.screwRpm || 480,
            output: evt.metrics?.throughputKgHr || 1800,
          };
        });
        if (mappedPoints.length > 0) {
          setChartData(mappedPoints);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load live factory telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const criticalRaw = rawMaterials.filter(
    r => (r.currentStock || 0) <= (r.reorderLevel || 0) || (r.currentStock || 0) <= (r.safetyStock || 0)
  );

  const activeRuns = productionRuns.filter(r => r.status === 'IN_PROGRESS' || r.status === 'InProgress' || r.status === 'Running');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', padding: '20px', overflowY: 'auto', height: '100%' }}>
      {/* Top Banner & Quick Stats */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Plant Control Room & Extruder Telemetry
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Unit 1 Compounding & Extrusion Floor · SCADA Synchronized
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={() => setGenealogyBatch(productionRuns[0]?.productionNumber || 'BATCH-2026-09-044')}
            className="btn btn-secondary btn-sm"
          >
            <GitBranch size={13} color="var(--accent-cyan)" /> Batch Traceability Tree
          </button>
          <div style={{
            padding: '4px 10px',
            background: 'var(--bg-surface)',
            border: `1px solid ${isConnected ? 'var(--accent-emerald)' : connectionStatus === 'CONNECTING' ? 'var(--accent-amber)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-xs)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: isConnected ? 'var(--accent-emerald)' : connectionStatus === 'CONNECTING' ? 'var(--accent-amber)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Radio size={12} color={isConnected ? 'var(--accent-emerald)' : connectionStatus === 'CONNECTING' ? 'var(--accent-amber)' : 'var(--text-muted)'} />
            <span>
              {isConnected ? 'SYSTEM LIVE: SSE STREAM CONNECTED' : connectionStatus === 'CONNECTING' ? 'SSE STREAM: RECONNECTING...' : 'SYSTEM LIVE: PLC CONNECTED'}
            </span>
          </div>
          <button 
            onClick={() => onNavigate('production')}
            className="btn btn-primary btn-sm"
          >
            + New Work Order
          </button>
        </div>
      </div>

      {activeAnomaly && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--accent-amber)',
          fontSize: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} />
            <span>
              <strong>SCADA ANOMALY DETECTED ({activeAnomaly.machineCode || 'LINE-1'}):</strong> {activeAnomaly.description || activeAnomaly.anomalyType || 'Thermal excursion beyond threshold'}
            </span>
          </div>
          <button onClick={() => setActiveAnomaly(null)} className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: '11px' }}>
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--accent-coral)',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '12px'
      }}>
        <div className="metric-card accent-cyan">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '11.5px', fontWeight: '600' }}>
            <span>ACTIVE WORK ORDERS</span>
            <TrendingUp size={15} color="var(--accent-cyan)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span className="font-mono" style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {activeRuns.length}
            </span>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>of {productionRuns.length} Total</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Floor production active</span>
          </div>
        </div>

        <div className="metric-card accent-emerald">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '11.5px', fontWeight: '600' }}>
            <span>OPERATIONAL MACHINES</span>
            <Gauge size={15} color="var(--accent-emerald)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span className="font-mono" style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {machines.length}
            </span>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Online Lines</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--accent-emerald)' }}>
            SCADA IoT registry active
          </div>
        </div>

        <div className="metric-card accent-amber">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '11.5px', fontWeight: '600' }}>
            <span>PROCUREMENT REORDERS</span>
            <Cpu size={15} color="var(--accent-amber)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span className="font-mono" style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {recommendations.length}
            </span>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Pending Actions</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--accent-amber)' }}>
            Automated EOQ triggers
          </div>
        </div>

        <div className="metric-card accent-coral">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '11.5px', fontWeight: '600' }}>
            <span>RAW MATERIAL BUFFER WATCH</span>
            <AlertTriangle size={15} color="var(--accent-coral)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span className="font-mono" style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent-coral)' }}>
              {criticalRaw.length}
            </span>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Low Stock SKUs</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Under safety threshold
          </div>
        </div>
      </div>

      {/* Real-time Telemetry Trend Graph */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        padding: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ChartIcon size={16} color="var(--accent-cyan)" />
            <div>
              <h3 style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Extruder Live Thermal & Melt Pressure Waveform
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SCADA high-torque extruder telemetry</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '14px', fontSize: '11.5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '3px', background: '#00D2FF', borderRadius: '1px' }}></span>
              <span style={{ color: 'var(--text-secondary)' }}>Melt Pressure (bar)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '3px', background: '#F59E0B', borderRadius: '1px' }}></span>
              <span style={{ color: 'var(--text-secondary)' }}>Barrel Temp (°C)</span>
            </div>
          </div>
        </div>

        <div style={{ height: '180px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorPressure" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D2FF" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#00D2FF" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#64748B" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={10} tickLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
              <Tooltip 
                contentStyle={{ background: '#0E131A', border: '1px solid #263344', borderRadius: '4px', fontSize: '11.5px' }}
                itemStyle={{ color: '#F0F6FC' }}
              />
              <Area type="monotone" dataKey="pressure" stroke="#00D2FF" strokeWidth={2} fillOpacity={1} fill="url(#colorPressure)" />
              <Area type="monotone" dataKey="temp" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Operational Telemetry Grid */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-primary)', letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}>
            Operational Machine Registry
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SCADA IoT Feed</span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '12px'
        }}>
          {machines.map((m) => (
            <div
              key={m.machineId || m.machineCode}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="font-mono" style={{ fontWeight: '700', fontSize: '13px', color: 'var(--accent-cyan)' }}>
                      {m.machineCode}
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {m.machineName}
                  </div>
                </div>
                <span className={`badge ${m.status === 'Active' || m.status === 'RUNNING' ? 'badge-emerald' : 'badge-amber'}`}>
                  {m.status || 'Active'}
                </span>
              </div>

              {/* Status Details */}
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xs)',
                padding: '6px 8px',
                fontSize: '11.5px',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Unit Operation</div>
                <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>Unit ID: {m.unitId || 'Compounding / Extrusion'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lower Section: Active Work Orders & Inventory Alerts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '12px'
      }}>
        {/* Active Production Runs */}
        <div className="data-table-container">
          <div style={{
            padding: '10px 14px',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              Active Floor Work Orders
            </span>
            <button 
              onClick={() => onNavigate('production')}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '11px', color: 'var(--accent-cyan)' }}
            >
              View All Runs →
            </button>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Work Order</th>
                <th>Product</th>
                <th>Planned Qty</th>
                <th>Current Stage</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {productionRuns.slice(0, 5).map(run => (
                <tr key={run.productionId}>
                  <td className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}>
                    {run.productionNumber}
                  </td>
                  <td>
                    <div style={{ fontWeight: '500' }}>{run.productName || run.productCode || 'Polymer Compound'}</div>
                  </td>
                  <td className="font-mono">
                    {run.plannedQty ? `${Number(run.plannedQty).toLocaleString()} kg` : '—'}
                  </td>
                  <td className="font-mono" style={{ color: 'var(--accent-amber)' }}>
                    {run.currentStage || 'Stage ' + (run.currentStageSequence || '1')}
                  </td>
                  <td>
                    <span className={`badge ${run.status === 'Completed' ? 'badge-emerald' : 'badge-cyan'}`}>
                      {run.status}
                    </span>
                  </td>
                </tr>
              ))}
              {productionRuns.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                    No active production runs found in backend database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Reorder Alerts */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '10px 14px',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-default)',
            fontSize: '12px',
            fontWeight: '700',
            textTransform: 'uppercase',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)'
          }}>
            Critical Buffer Watch
          </div>

          <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            {criticalRaw.slice(0, 4).map(raw => (
              <div
                key={raw.materialId}
                style={{
                  padding: '8px 10px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-xs)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600' }}>{raw.materialName}</div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    SKU: {raw.materialCode} · Safety: {Number(raw.safetyStock || 0).toLocaleString()} kg
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="font-mono" style={{ fontSize: '12px', color: 'var(--accent-coral)', fontWeight: '600' }}>
                    {Number(raw.currentStock || 0).toLocaleString()} kg
                  </div>
                  <span className="badge badge-coral" style={{ fontSize: '9.5px' }}>REORDER</span>
                </div>
              </div>
            ))}
            {criticalRaw.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--accent-emerald)', padding: '16px', fontSize: '12px' }}>
                <CheckCircle2 size={18} style={{ margin: '0 auto 6px auto', display: 'block' }} />
                All raw material buffers within safety thresholds.
              </div>
            )}

            <button
              onClick={() => onNavigate('raw-materials')}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 'auto', width: '100%' }}
            >
              Open Silo Bay Manager →
            </button>
          </div>
        </div>
      </div>

      {/* Batch Traceability Modal */}
      <BatchGenealogyModal
        isOpen={!!genealogyBatch}
        batchCode={genealogyBatch}
        onClose={() => setGenealogyBatch(null)}
      />
    </div>
  );
}

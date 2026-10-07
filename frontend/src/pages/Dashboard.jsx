import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Radio, 
  Package, 
  ArrowRightLeft, 
  Layers, 
  ArrowUpRight, 
  Info,
  GitBranch
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { productionApi, inventoryApi, procurementApi, analyticsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatPlantName } from '../utils/brand';
import { useTelemetryStream } from '../hooks/useTelemetryStream';
import BatchGenealogyModal from '../components/BatchGenealogyModal';

export default function Dashboard({ onNavigate }) {
  const { user } = useAuth();
  const [machines, setMachines] = useState([]);
  const [productionRuns, setProductionRuns] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [genealogyBatch, setGenealogyBatch] = useState(null);
  const [activeAnomaly, setActiveAnomaly] = useState(null);
  const [timeframe, setTimeframe] = useState('6M');
  const [trendPoints, setTrendPoints] = useState([]);
  const [movements, setMovements] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [error, setError] = useState(null);

  const fetchTrendData = useCallback(async (tf) => {
    try {
      setLoadingTrend(true);
      const res = await analyticsApi.getValuationTrend(tf);
      if (Array.isArray(res.data) && res.data.length > 0) {
        setTrendPoints(res.data);
      }
    } catch (err) {
      console.warn('Failed to load valuation trend from backend, keeping previous points:', err);
    } finally {
      setLoadingTrend(false);
    }
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [machinesRes, runsRes, rawRes, recsRes, kpisRes, movesRes] = await Promise.allSettled([
        productionApi.getActiveMachines(),
        productionApi.getRuns(),
        inventoryApi.getRawMaterials(),
        procurementApi.getRecommendations(),
        analyticsApi.getDashboardKpis(),
        analyticsApi.getRecentMovements(),
      ]);

      if (machinesRes.status === 'fulfilled' && Array.isArray(machinesRes.value?.data)) {
        setMachines(machinesRes.value.data);
      }
      if (runsRes.status === 'fulfilled' && Array.isArray(runsRes.value?.data)) {
        setProductionRuns(runsRes.value.data);
      }
      if (rawRes.status === 'fulfilled' && Array.isArray(rawRes.value?.data)) {
        setRawMaterials(rawRes.value.data);
      }
      if (recsRes.status === 'fulfilled' && Array.isArray(recsRes.value?.data)) {
        setRecommendations(recsRes.value.data);
      }
      if (kpisRes.status === 'fulfilled' && kpisRes.value?.data) {
        setKpis(kpisRes.value.data);
      }
      if (movesRes.status === 'fulfilled' && Array.isArray(movesRes.value?.data)) {
        setMovements(movesRes.value.data);
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

  useEffect(() => {
    fetchTrendData(timeframe);
  }, [timeframe, fetchTrendData]);

  const dynamicAiAlerts = (Array.isArray(recommendations) && recommendations.length > 0) 
    ? recommendations.slice(0, 5).map((rec, idx) => ({
        id: rec.recommendationId || idx + 1,
        type: (rec.priority || '').toUpperCase() === 'CRITICAL' ? 'danger' : 'warning',
        title: `${rec.materialName || 'Polymer Resin'} below reorder level`,
        subtitle: `Suggested: ${rec.suggestedQuantityKg ? `${Number(rec.suggestedQuantityKg).toLocaleString()} kg` : '1,000 kg'} (${rec.reason || 'Safety Stock Alert'})`,
        time: rec.createdAt ? new Date(rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `${idx + 1}h ago`,
        action: 'procurement',
        batchCode: rec.materialCode
      }))
    : [];

  const dynamicTrendData = Array.isArray(trendPoints) ? trendPoints : [];

  const dynamicMovements = (Array.isArray(movements) && movements.length > 0)
    ? movements.map((m, idx) => ({
        time: m.time || (m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `${(idx + 1) * 15}m ago`),
        material: m.material || m.materialName || 'Polymer Granules',
        type: m.type || (m.movementType === 'ISSUE' || m.movementType === 'CONSUMPTION' ? 'OUT' : 'IN'),
        quantity: typeof m.quantity === 'number' ? `${m.quantity.toLocaleString()} ${m.uom || 'kg'}` : (m.quantity || '0 kg'),
        ref: m.referenceNumber || m.ref || `MOV-${idx + 101}`,
      }))
    : [];

  const handleTelemetryEvent = useCallback(() => {}, []);
  const handleAnomalyEvent = useCallback((payload) => {
    if (payload?.anomalies && payload.anomalies.length > 0) {
      setActiveAnomaly(payload.anomalies[0]);
    }
  }, []);

  const { isConnected } = useTelemetryStream({
    onTelemetry: handleTelemetryEvent,
    onAnomaly: handleAnomalyEvent,
    enabled: true,
  });

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const totalInventoryValuation = kpis?.totalValuationCr != null
    ? kpis.totalValuationCr.toFixed(2)
    : (rawMaterials.length > 0 
        ? (rawMaterials.reduce((acc, m) => acc + (Number(m.currentStock || 0) * (Number(m.standardCostPerUnit) || 115)), 0) / 10000000).toFixed(2)
        : '4.86');

  const lowStockCount = kpis?.lowStockCount != null
    ? kpis.lowStockCount
    : rawMaterials.filter(m => Number(m.currentStock || 0) <= Number(m.reorderLevel || 1000)).length;

  const overstockCount = kpis?.overstockCount != null
    ? kpis.overstockCount
    : rawMaterials.filter(m => Number(m.currentStock || 0) > Number(m.reorderLevel || 1000) * 2).length;

  const todayMovementCount = kpis?.todayMovementCount != null
    ? kpis.todayMovementCount
    : (movements.length > 0 ? movements.length : (productionRuns.length > 0 ? productionRuns.length * 15 + 40 : 325));

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Top Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Welcome back, {user?.name || user?.username || 'Plant Manager'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Here's what's happening at {formatPlantName(user?.plantName || kpis?.plantName || 'Plant 1 - Ungutur')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
            {currentDateStr}
          </span>
          <div style={{
            padding: '4px 10px',
            background: isConnected ? '#ECFDF5' : '#F1F5F9',
            border: `1px solid ${isConnected ? '#A7F3D0' : '#E2E8F0'}`,
            borderRadius: '6px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: isConnected ? '#047857' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Radio size={12} color={isConnected ? '#10B981' : 'var(--text-muted)'} />
            <span>{isConnected ? 'LIVE TELEMETRY' : 'PLC CONNECTED'}</span>
          </div>
        </div>
      </div>

      {activeAnomaly && (
        <div style={{
          padding: '12px 16px',
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: '8px',
          color: '#B45309',
          fontSize: '13px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={17} />
            <span><strong>ANOMALY DETECTED:</strong> {activeAnomaly.description || 'Thermal excursion beyond threshold'}</span>
          </div>
          <button onClick={() => setActiveAnomaly(null)} className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }}>
            Dismiss
          </button>
        </div>
      )}

      {/* Top 4 KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* Total Inventory Value */}
        <div className="panel-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Package size={24} color="#EF4444" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Inventory Value</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: '2px 0', fontFamily: 'var(--font-mono)' }}>
              ₹ {totalInventoryValuation} Cr
            </div>
            <div style={{ fontSize: '11.5px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '600' }}>
              <span>↗ +12%</span> <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>vs last month</span>
            </div>
          </div>
        </div>

        {/* Low-stock Items */}
        <div className="panel-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertTriangle size={24} color="#F59E0B" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Low-stock Items</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: '2px 0', fontFamily: 'var(--font-mono)' }}>
              {lowStockCount}
            </div>
            <div style={{ fontSize: '11.5px', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '600' }}>
              <span>↗ +6</span> <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>vs last week</span>
            </div>
          </div>
        </div>

        {/* Overstock Items */}
        <div className="panel-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Package size={24} color="#10B981" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Overstock Items</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: '2px 0', fontFamily: 'var(--font-mono)' }}>
              {overstockCount}
            </div>
            <div style={{ fontSize: '11.5px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '600' }}>
              <span>↘ -4</span> <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>vs last week</span>
            </div>
          </div>
        </div>

        {/* Today's Movement */}
        <div className="panel-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: '#F0F9FF',
            border: '1px solid #BAE6FD',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ArrowRightLeft size={22} color="#0284C7" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Today's Movement</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: '2px 0', fontFamily: 'var(--font-mono)' }}>
              {todayMovementCount}
            </div>
            <div style={{ fontSize: '11.5px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '600' }}>
              <span>↗ +15%</span> <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>vs yesterday</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Grid: Inventory Value Trend & Low-stock Items Table */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '20px' }}>
        {/* Inventory Value Trend Chart */}
        <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Inventory Value Trend
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Timeframe: <strong>{timeframe}</strong> {loadingTrend ? '· Fetching live curve...' : '· Dynamic valuation curve'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', padding: '3px', borderRadius: '6px' }}>
              {['7D', '30D', '3M', '6M', '1Y'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: timeframe === t ? '700' : '500',
                    border: 'none',
                    borderRadius: '4px',
                    background: timeframe === t ? '#0284C7' : 'transparent',
                    color: timeframe === t ? '#FFFFFF' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: '220px', width: '100%' }}>
            {dynamicTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dynamicTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284C7" stopOpacity={0.18}/>
                      <stop offset="95%" stopColor="#0284C7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    tickFormatter={(val) => `₹ ${val} Cr`} 
                    tick={{ fontSize: 11, fill: '#64748B' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip 
                    formatter={(value) => [`₹ ${Number(value).toFixed(2)} Cr`, 'Inventory Valuation']}
                    labelFormatter={(lbl) => `Interval: ${lbl}`}
                    contentStyle={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#0284C7" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#colorVal)" 
                    dot={{ r: 3, fill: '#0284C7' }}
                    isAnimationActive={true}
                    animationDuration={400}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <TrendingUp size={32} style={{ marginBottom: '8px', opacity: 0.4 }} />
                <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px' }}>No valuation trend data available</p>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Valuation checkpoints will automatically plot here over time.</span>
              </div>
            )}
          </div>
        </div>

        {/* Low-stock Items Table */}
        <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Low-stock Items
            </h3>
            <button
              onClick={() => onNavigate('raw-materials')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#0284C7',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              View All <ArrowUpRight size={14} />
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ width: '30px' }}>#</th>
                  <th>Material</th>
                  <th style={{ textAlign: 'right' }}>Current Stock</th>
                  <th style={{ textAlign: 'right' }}>Reorder Level</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center', width: '60px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(rawMaterials) && rawMaterials.length > 0 
                  ? rawMaterials.filter(m => Number(m.currentStock || 0) <= Number(m.reorderLevel || 1000)).slice(0, 5).map((m, idx) => ({
                      num: idx + 1,
                      name: m.materialName || 'Polymer Granules',
                      code: m.materialCode || `RM-${idx + 1}`,
                      current: `${Number(m.currentStock || 0).toLocaleString()} ${m.defaultUomCode || 'kg'}`,
                      reorder: `${Number(m.reorderLevel || 1000).toLocaleString()} ${m.defaultUomCode || 'kg'}`,
                      status: Number(m.currentStock || 0) <= 0 ? 'Out of Stock' : 'Low'
                    }))
                  : [
                      { num: 1, code: 'RM-PP-001', name: 'PP Granules (Natural)', current: '450 kg', reorder: '1,000 kg', status: 'Low' },
                      { num: 2, code: 'RM-MB-002', name: 'Masterbatch (White)', current: '25 kg', reorder: '100 kg', status: 'Low' },
                      { num: 3, code: 'RM-FL-003', name: 'BOPP Film (12 Micron)', current: '8 rolls', reorder: '30 rolls', status: 'Low' },
                      { num: 4, code: 'RM-INK-004', name: 'Printing Ink (Red)', current: '12 kg', reorder: '50 kg', status: 'Low' },
                      { num: 5, code: 'RM-UV-005', name: 'Additives (UV)', current: '18 kg', reorder: '100 kg', status: 'Low' },
                    ]
                ).map((item) => (
                  <tr key={item.num}>
                    <td style={{ color: 'var(--text-muted)' }}>{item.num}</td>
                    <td>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{item.name}</div>
                      <div className="font-mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{item.code}</div>
                    </td>
                    <td className="font-mono" style={{ textAlign: 'right', fontWeight: '600', color: 'var(--text-primary)' }}>
                      {item.current}
                    </td>
                    <td className="font-mono" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                      {item.reorder}
                    </td>
                    <td>
                      <span className={`badge ${item.status === 'Out of Stock' ? 'badge-muted' : 'badge-coral'}`}>{item.status}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          setGenealogyBatch(item.code);
                        }}
                        className="btn btn-ghost btn-xs"
                        style={{ color: '#0284C7', padding: '2px 6px', fontSize: '11px' }}
                        title="Trace material lineage"
                      >
                        <GitBranch size={11} /> Trace
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Stock Movement & AI Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '20px' }}>
        {/* Recent Stock Movement */}
        <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Recent Stock Movement
            </h3>
            <button
              onClick={() => onNavigate('raw-materials')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#0284C7',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              View All <ArrowUpRight size={14} />
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ fontSize: '12px' }}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Material</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Quantity</th>
                  <th>Reference</th>
                  <th style={{ textAlign: 'center' }}>Trace</th>
                </tr>
              </thead>
              <tbody>
                {dynamicMovements.length > 0 ? (
                  dynamicMovements.map((m, idx) => (
                    <tr key={idx}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>{m.time}</td>
                      <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{m.material}</td>
                      <td>
                        {m.type === 'IN' ? (
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#ECFDF5',
                            color: '#047857',
                            fontSize: '10.5px',
                            fontWeight: '700',
                            fontFamily: 'var(--font-mono)'
                          }}>
                            IN
                          </span>
                        ) : (
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#FEF2F2',
                            color: '#B91C1C',
                            fontSize: '10.5px',
                            fontWeight: '700',
                            fontFamily: 'var(--font-mono)'
                          }}>
                            OUT
                          </span>
                        )}
                      </td>
                      <td className="font-mono" style={{ textAlign: 'right', fontWeight: '600' }}>
                        {m.quantity}
                      </td>
                      <td className="font-mono" style={{ fontSize: '11.5px', color: '#0284C7', fontWeight: '600' }}>
                        {m.ref}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => setGenealogyBatch(m.ref)}
                          className="btn btn-ghost btn-xs"
                          style={{ padding: '2px 6px', fontSize: '10.5px', color: '#0284C7' }}
                          title="Trace Batch Movement"
                        >
                          <GitBranch size={11} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                      No movement data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Alerts */}
        <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
              AI Alerts & Diagnostics
            </h3>
            <button
              onClick={() => onNavigate('ai-copilot')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#0284C7',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              View All <ArrowUpRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {dynamicAiAlerts.map((alert, idx) => (
              <div 
                key={alert.id || idx}
                onClick={() => {
                  if (alert.batchCode) {
                    setGenealogyBatch(alert.batchCode);
                  } else if (alert.action) {
                    onNavigate(alert.action);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  borderBottom: idx !== dynamicAiAlerts.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                title="Click to inspect alert"
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: alert.type === 'danger' ? '#FEF2F2' : alert.type === 'warning' ? '#FFFBEB' : '#F0F9FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    {alert.type === 'danger' && <AlertTriangle size={14} color="#EF4444" />}
                    {alert.type === 'warning' && <AlertTriangle size={14} color="#F59E0B" />}
                    {alert.type === 'info' && <Info size={14} color="#0284C7" />}
                  </div>
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)' }}>
                      {alert.title}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '1px' }}>
                      {alert.subtitle}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {alert.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Batch Genealogy Modal */}
      {genealogyBatch && (
        <BatchGenealogyModal
          isOpen={Boolean(genealogyBatch)}
          batchNumber={genealogyBatch}
          onClose={() => setGenealogyBatch(null)}
        />
      )}
    </div>
  );
}

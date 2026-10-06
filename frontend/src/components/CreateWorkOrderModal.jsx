import React, { useState, useEffect } from 'react';
import { X, Cpu, AlertTriangle } from 'lucide-react';
import { productionApi } from '../services/api';

export default function CreateWorkOrderModal({ isOpen, onClose, onRunAdded, boms = [] }) {
  const [machines, setMachines] = useState([]);
  const [formData, setFormData] = useState({
    productionNumber: 'WO-SVP-01',
    bomId: boms[0]?.bomId || 1,
    plannedQty: '10000',
    machineId: '1',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        productionNumber: `WO-SVP-${Date.now().toString().slice(-4)}`,
        bomId: boms[0]?.bomId || 1,
      }));
      productionApi.getActiveMachines().then(res => {
        setMachines(res.data || []);
      }).catch(() => {});
    }
  }, [isOpen, boms]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        productionNumber: formData.productionNumber?.trim() || undefined,
        bomId: formData.bomId ? Number(formData.bomId) : null,
        machineId: formData.machineId ? Number(formData.machineId) : null,
        plannedQty: parseFloat(formData.plannedQty),
      };

      await productionApi.createRun(payload);
      if (onRunAdded) {
        onRunAdded();
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to dispatch work order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} color="var(--accent-amber)" />
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Create Production Work Order
            </h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{
            padding: '8px 12px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-coral)',
            fontSize: '12px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Work Order Number
              </label>
              <input
                type="text"
                required
                className="input font-mono"
                value={formData.productionNumber}
                onChange={(e) => setFormData({ ...formData, productionNumber: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Extruder Line
              </label>
              <select
                className="select font-mono"
                value={formData.machineId}
                onChange={(e) => setFormData({ ...formData, machineId: e.target.value })}
              >
                {machines.map(m => (
                  <option key={m.machineId} value={m.machineId}>
                    {m.machineCode} — {m.machineName}
                  </option>
                ))}
                {machines.length === 0 && (
                  <option value="1">EXT-01 (Line A)</option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Formulation BOM Recipe
            </label>
            <select
              className="select"
              value={formData.bomId}
              onChange={(e) => setFormData({ ...formData, bomId: e.target.value })}
            >
              {boms.map(b => (
                <option key={b.bomId} value={b.bomId}>
                  {b.bomCode} — {b.productName} (v{b.versionNumber})
                </option>
              ))}
              {boms.length === 0 && (
                <option value="1">BOM-HDPE-40B (HDPE Masterbatch 40%)</option>
              )}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Batch Planned Target (kg)
            </label>
            <input
              type="number"
              required
              className="input font-mono"
              value={formData.plannedQty}
              onChange={(e) => setFormData({ ...formData, plannedQty: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
              {submitting ? 'Dispatching...' : 'Dispatch to Extruder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

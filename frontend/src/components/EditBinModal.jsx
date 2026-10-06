import React, { useState, useEffect } from 'react';
import { X, Layers, AlertCircle, Save, AlertTriangle } from 'lucide-react';
import { updateBin, extractErrorMessage } from '../services/domain/warehouseService';

export default function EditBinModal({ isOpen, bin, warehouse, onClose, onBinUpdated }) {
  const [binCode, setBinCode] = useState('');
  const [capacityKg, setCapacityKg] = useState('5000');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && bin) {
      setBinCode(bin.binCode || '');
      setCapacityKg(bin.capacityKg !== undefined && bin.capacityKg !== null ? String(bin.capacityKg) : '5000');
      setIsActive(bin.isActive !== false);
      setError(null);
    }
  }, [isOpen, bin]);

  if (!isOpen || !bin) return null;

  const currentStock = Number(bin.currentStockKg || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!binCode.trim()) {
      setError('Bin code is required.');
      return;
    }
    const capNum = parseFloat(capacityKg);
    if (isNaN(capNum) || capNum <= 0) {
      setError('Maximum capacity must be a positive number.');
      return;
    }

    if (capNum < currentStock) {
      setError(`Cannot set capacity (${capNum.toLocaleString()} kg) lower than current stored stock (${currentStock.toLocaleString()} kg).`);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await updateBin(bin.binId, {
        binCode: binCode.trim().toUpperCase(),
        capacityKg: capNum,
        isActive,
      });

      if (onBinUpdated) {
        onBinUpdated(res.data);
      }
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update storage bin.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', padding: '22px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
              Edit Storage Bin
            </h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Location Context */}
        <div
          style={{
            padding: '10px 12px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '14px',
            fontSize: '11.5px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Warehouse:</span>
            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{bin.warehouseName || warehouse?.warehouseName || 'Warehouse'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Location:</span>
            <span style={{ fontWeight: '700', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
              {bin.rackCode || '—'} &gt; {bin.shelfCode || '—'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Current Stored Stock:</span>
            <span style={{ fontWeight: '700', color: currentStock > 0 ? 'var(--accent-cyan)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {currentStock.toLocaleString()} kg
            </span>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div
            style={{
              padding: '10px 12px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--accent-coral)',
              fontSize: '12px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Bin Code */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Bin Code / Identifier *
            </label>
            <input
              type="text"
              className="input font-mono"
              placeholder="e.g. BIN-U1-01"
              value={binCode}
              onChange={(e) => {
                setBinCode(e.target.value);
                setError(null);
              }}
              required
            />
          </div>

          {/* Maximum Capacity & Active Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Max Capacity (kg) *
              </label>
              <input
                type="number"
                step="any"
                min="1"
                className="input font-mono"
                placeholder="5000"
                value={capacityKg}
                onChange={(e) => {
                  setCapacityKg(e.target.value);
                  setError(null);
                }}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '18px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-cyan)' }}
                />
                <span style={{ fontWeight: '600' }}>Active Bin</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={submitting}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {submitting ? 'Saving...' : (
                <>
                  <Save size={14} /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, Layers, AlertCircle, Plus } from 'lucide-react';
import { createBin, extractErrorMessage } from '../services/domain/warehouseService';

export default function CreateBinModal({ isOpen, warehouse, rack, shelf, onClose, onBinCreated }) {
  const [binCode, setBinCode] = useState('');
  const [capacityKg, setCapacityKg] = useState('5000');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setBinCode('');
      setCapacityKg('5000');
      setIsActive(true);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !shelf) return null;

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

    try {
      setSubmitting(true);
      setError(null);

      const res = await createBin(shelf.shelfId, {
        binCode: binCode.trim().toUpperCase(),
        capacityKg: capNum,
        isActive,
      });

      if (onBinCreated) {
        onBinCreated(res.data);
      }
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to create storage bin.'));
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
              Add Storage Bin
            </h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Target Context Info */}
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
            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{warehouse?.warehouseName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Rack & Shelf:</span>
            <span style={{ fontWeight: '700', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
              {rack?.rackCode} &gt; {shelf.shelfCode} (L{shelf.shelfLevel})
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
              Bin Code *
            </label>
            <input
              type="text"
              className="input font-mono"
              placeholder="e.g. BIN-U1-05 or BIN-01"
              value={binCode}
              onChange={(e) => {
                setBinCode(e.target.value);
                setError(null);
              }}
              required
            />
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Unique alphanumeric code within {shelf.shelfCode}.
            </span>
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
                onChange={(e) => setCapacityKg(e.target.value)}
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
              {submitting ? 'Adding...' : (
                <>
                  <Plus size={14} /> Add Bin
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, Hash, AlertCircle, Plus } from 'lucide-react';
import { createShelf, extractErrorMessage } from '../services/domain/warehouseService';

export default function CreateShelfModal({ isOpen, warehouse, rack, onClose, onShelfCreated }) {
  const [shelfCode, setShelfCode] = useState('');
  const [shelfLevel, setShelfLevel] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setShelfCode('');
      // Suggest next shelf level based on existing shelves if present
      const nextLevel = rack && Array.isArray(rack.shelves) ? rack.shelves.length + 1 : 1;
      setShelfLevel(nextLevel);
      setIsActive(true);
      setError(null);
    }
  }, [isOpen, rack]);

  if (!isOpen || !rack) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!shelfCode.trim()) {
      setError('Shelf code is required.');
      return;
    }
    if (!shelfLevel || Number(shelfLevel) < 1) {
      setError('Shelf level must be 1 or greater.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await createShelf(rack.rackId, {
        shelfCode: shelfCode.trim().toUpperCase(),
        shelfLevel: Number(shelfLevel),
        isActive,
      });

      if (onShelfCreated) {
        onShelfCreated(res.data);
      }
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to create storage shelf.'));
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
            <Hash size={18} color="var(--accent-amber)" />
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
              Add Storage Shelf
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
            <span style={{ color: 'var(--text-muted)' }}>Parent Rack:</span>
            <span style={{ fontWeight: '700', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
              {rack.rackCode} (#{rack.rackId})
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
          {/* Shelf Code */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Shelf Code *
            </label>
            <input
              type="text"
              className="input font-mono"
              placeholder="e.g. SHELF-U1-03 or LEVEL-1"
              value={shelfCode}
              onChange={(e) => {
                setShelfCode(e.target.value);
                setError(null);
              }}
              required
            />
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Unique shelf identifier within {rack.rackCode}.
            </span>
          </div>

          {/* Shelf Level & Active Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Shelf Level (Height Tier) *
              </label>
              <input
                type="number"
                className="input font-mono"
                min="1"
                max="20"
                value={shelfLevel}
                onChange={(e) => setShelfLevel(e.target.value)}
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
                <span style={{ fontWeight: '600' }}>Active Shelf</span>
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
                  <Plus size={14} /> Add Shelf
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

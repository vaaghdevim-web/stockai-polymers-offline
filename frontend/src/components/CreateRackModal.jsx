import React, { useState, useEffect } from 'react';
import { X, FolderTree, AlertCircle, Plus } from 'lucide-react';
import { createRack, extractErrorMessage } from '../services/domain/warehouseService';

export default function CreateRackModal({ isOpen, warehouse, onClose, onRackCreated }) {
  const [rackCode, setRackCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setRackCode('');
      setIsActive(true);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !warehouse) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rackCode.trim()) {
      setError('Rack code is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await createRack(warehouse.warehouseId, {
        rackCode: rackCode.trim().toUpperCase(),
        isActive,
      });

      if (onRackCreated) {
        onRackCreated(res.data);
      }
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to create storage rack.'));
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
            <FolderTree size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
              Add Storage Rack
            </h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Target Warehouse Context Badge */}
        <div
          style={{
            padding: '10px 12px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '14px',
            fontSize: '11.5px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>Target Warehouse:</span>
          <span style={{ fontWeight: '700', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
            {warehouse.warehouseName} (#{warehouse.warehouseId})
          </span>
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
          {/* Rack Code */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Rack Code *
            </label>
            <input
              type="text"
              className="input font-mono"
              placeholder="e.g. RACK-U1-03 or RACK-A"
              value={rackCode}
              onChange={(e) => {
                setRackCode(e.target.value);
                setError(null);
              }}
              required
            />
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Unique alphanumeric code within {warehouse.warehouseName}.
            </span>
          </div>

          {/* Active Status */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-cyan)' }}
              />
              <span style={{ fontWeight: '600' }}>Active Rack</span>
            </label>
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
                  <Plus size={14} /> Add Rack
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

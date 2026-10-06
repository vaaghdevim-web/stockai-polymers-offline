import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, AlertCircle, ShieldAlert, Eraser } from 'lucide-react';
import { deleteBin, clearBinStock, extractErrorMessage } from '../services/domain/warehouseService';

export default function DeleteBinModal({ isOpen, bin, onClose, onBinDeleted, onStockCleared }) {
  const [submitting, setSubmitting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !bin) return null;

  const currentStock = Number(bin.currentStockKg || 0);
  const palletCount = Number(bin.activePalletCount || 0);
  const hasStock = currentStock > 0 || palletCount > 0;

  const handleDelete = async () => {
    if (hasStock && !forceDelete) {
      setError('Bin has active stock. Please check "Force delete & wipe stock" or clear the stock first.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await deleteBin(bin.binId, forceDelete);
      if (onBinDeleted) {
        onBinDeleted(bin);
      }
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete storage bin.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearOnly = async () => {
    try {
      setClearing(true);
      setError(null);
      await clearBinStock(bin.binId);
      if (onStockCleared) {
        onStockCleared(bin);
      }
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to clear bin stock.'));
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px', padding: '22px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trash2 size={18} color="var(--accent-coral)" />
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
              Delete Storage Bin
            </h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
            <X size={16} />
          </button>
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

        {/* Warning if has stock */}
        {hasStock ? (
          <div
            style={{
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              marginBottom: '14px',
              lineHeight: 1.5
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', color: 'var(--accent-coral)', marginBottom: '4px' }}>
              <ShieldAlert size={16} /> Active Stock Detected
            </div>
            This bin currently holds <strong style={{ color: 'var(--accent-coral)' }}>{currentStock.toLocaleString()} kg</strong> of stored inventory
            {palletCount > 0 ? ` and ${palletCount} pallet(s)` : ''}.
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="chk-force-delete"
                checked={forceDelete}
                onChange={(e) => setForceDelete(e.target.checked)}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <label htmlFor="chk-force-delete" style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--accent-coral)', cursor: 'pointer' }}>
                Force Delete & Wipe Associated Bin Stock
              </label>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
            Are you sure you want to delete bin <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{bin.binCode}</strong>?
            This physical location will be removed from the warehouse topology.
          </p>
        )}

        {/* Location Context */}
        <div
          style={{
            padding: '10px 12px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '18px',
            fontSize: '11.5px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Bin Code:</span>
            <span style={{ fontWeight: '700', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{bin.binCode}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Location:</span>
            <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{bin.rackCode} &gt; {bin.shelfCode}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Stored Stock:</span>
            <span className="font-mono" style={{ fontWeight: '700', color: hasStock ? 'var(--accent-coral)' : 'var(--accent-emerald)' }}>
              {currentStock.toLocaleString()} kg
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <div>
            {hasStock && (
              <button
                type="button"
                onClick={handleClearOnly}
                disabled={clearing || submitting}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                title="Wipe stock only without deleting the bin"
              >
                <Eraser size={13} color="var(--accent-amber)" />
                {clearing ? 'Clearing...' : 'Clear Stock Only'}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              disabled={submitting || clearing}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="btn btn-sm"
              disabled={submitting || clearing || (hasStock && !forceDelete)}
              style={{
                background: 'var(--accent-coral)',
                color: '#fff',
                border: 'none',
                opacity: (hasStock && !forceDelete) ? 0.5 : 1,
                cursor: (hasStock && !forceDelete) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {submitting ? 'Deleting...' : (
                <>
                  <Trash2 size={14} /> Confirm Delete
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

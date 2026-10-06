import React, { useState } from 'react';
import { X, Trash2, AlertCircle, ShieldAlert } from 'lucide-react';
import { deleteRack, extractErrorMessage } from '../services/domain/warehouseService';

export default function DeleteRackModal({ isOpen, rack, warehouse, onClose, onRackDeleted }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !rack) return null;

  const totalStock = Number(rack.totalCurrentStockKg || 0);
  const totalBins = Number(rack.totalBins || 0);
  const totalShelves = Number(rack.totalShelves || (rack.shelves ? rack.shelves.length : 0));
  const hasStock = totalStock > 0;

  const handleDelete = async () => {
    if (hasStock) {
      setError('Cannot delete a storage rack containing active inventory balances. Please move or clear inventory first.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await deleteRack(rack.rackId);
      if (onRackDeleted) {
        onRackDeleted(rack);
      }
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete storage rack.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: '22px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trash2 size={18} color="var(--accent-coral)" />
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
              Delete Storage Rack
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
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--accent-coral)',
              fontSize: '12px',
              marginBottom: '14px',
              lineHeight: 1.5
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '4px' }}>
              <ShieldAlert size={16} /> Deletion Blocked
            </div>
            This rack holds <strong>{totalStock.toLocaleString()} kg</strong> of active inventory across its bins. You must move or consume the stock before deleting this rack.
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
            Are you sure you want to delete rack <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{rack.rackCode}</strong>?
            This will also delete its {totalShelves} empty shelf(ves) and {totalBins} bin(s).
          </p>
        )}

        {/* Rack Context */}
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
            <span style={{ color: 'var(--text-muted)' }}>Rack Code:</span>
            <span style={{ fontWeight: '700', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{rack.rackCode}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Warehouse:</span>
            <span style={{ color: 'var(--text-primary)' }}>{warehouse?.warehouseName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Shelves / Bins:</span>
            <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{totalShelves} shelves, {totalBins} bins</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Total Stored Stock:</span>
            <span className="font-mono" style={{ color: hasStock ? 'var(--accent-coral)' : 'var(--accent-emerald)', fontWeight: '700' }}>
              {totalStock.toLocaleString()} kg
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="btn btn-sm"
            disabled={submitting || hasStock}
            style={{
              background: 'var(--accent-coral)',
              color: '#fff',
              border: 'none',
              opacity: hasStock ? 0.5 : 1,
              cursor: hasStock ? 'not-allowed' : 'pointer',
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
  );
}

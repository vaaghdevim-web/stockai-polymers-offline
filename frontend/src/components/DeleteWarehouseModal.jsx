import React, { useState } from 'react';
import { X, Trash2, AlertCircle, ShieldAlert, Building2, AlertTriangle } from 'lucide-react';
import { deleteWarehouse, extractErrorMessage } from '../services/domain/warehouseService';
import { formatPlantName } from '../utils/brand';

export default function DeleteWarehouseModal({ isOpen, warehouse, storageTree, onClose, onWarehouseDeleted }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [confirmText, setConfirmText] = useState('');

  if (!isOpen || !warehouse) return null;

  const totalRacks = storageTree?.totalRacks ?? (storageTree?.racks ? storageTree.racks.length : 0);
  const totalBins = storageTree?.totalBins ?? 0;
  const totalStockKg = storageTree?.totalCurrentStockKg ?? 0;
  const hasStock = totalStockKg > 0;
  const isProtectedName = confirmText.trim().toLowerCase() === warehouse.warehouseName.trim().toLowerCase();

  const handleDelete = async () => {
    if (hasStock) {
      setError(`Cannot delete warehouse "${warehouse.warehouseName}" while it contains ${totalStockKg.toLocaleString()} kg of active stock balance. Please clear or transfer inventory first.`);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await deleteWarehouse(warehouse.warehouseId);
      if (onWarehouseDeleted) {
        onWarehouseDeleted(warehouse.warehouseId);
      }
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete warehouse facility.'));
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
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trash2 size={18} color="var(--accent-coral)" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                Delete Warehouse Facility
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                Confirmation & Topology Safety Check
              </p>
            </div>
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

        {/* Warning Details Card */}
        <div
          style={{
            padding: '14px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {warehouse.warehouseName}
            </span>
            <span className="badge badge-neutral font-mono" style={{ fontSize: '10px' }}>
              ID: #{warehouse.warehouseId}
            </span>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            Plant: <strong style={{ color: 'var(--text-primary)' }}>{formatPlantName(warehouse.plantName || 'Sri Vidhya Polymers')}</strong>
          </div>
          <div style={{ display: 'flex', gap: '14px', fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed var(--border-subtle)' }}>
            <span>Racks: <strong style={{ color: 'var(--text-primary)' }}>{totalRacks}</strong></span>
            <span>Bins: <strong style={{ color: 'var(--text-primary)' }}>{totalBins}</strong></span>
            <span>Stored Stock: <strong style={{ color: hasStock ? 'var(--accent-coral)' : 'var(--text-primary)' }}>{totalStockKg.toLocaleString()} kg</strong></span>
          </div>
        </div>

        {/* Deletion Impact Warning */}
        {hasStock ? (
          <div
            style={{
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--accent-coral)',
              fontSize: '12px',
              marginBottom: '16px',
              lineHeight: 1.5
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '4px' }}>
              <ShieldAlert size={16} /> Deletion Blocked
            </div>
            This facility contains <strong>{totalStockKg.toLocaleString()} kg</strong> of stored inventory across its bins. Please transfer all stock or reset bins before deleting.
          </div>
        ) : (
          <div
            style={{
              padding: '12px',
              background: 'rgba(245, 158, 11, 0.10)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: '#D97706',
              fontSize: '12px',
              marginBottom: '16px',
              lineHeight: 1.5
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '4px' }}>
              <AlertTriangle size={16} /> Warning
            </div>
            Deleting this warehouse will deactivate it and remove it from active production, logistics, and dispatch selectors. This action cannot be undone automatically.
          </div>
        )}

        {/* Action Confirmation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="btn btn-secondary btn-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting || hasStock}
            className="btn btn-sm"
            style={{
              background: '#DC2626',
              color: '#FFFFFF',
              borderColor: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: hasStock ? 0.5 : 1,
              cursor: hasStock ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? (
              <>Deleting...</>
            ) : (
              <>
                <Trash2 size={14} /> Delete Warehouse
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

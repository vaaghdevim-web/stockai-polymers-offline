import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, AlertCircle, CheckCircle2, Loader2, PowerOff } from 'lucide-react';
import { supplierApi } from '../services/api';

export default function DeleteSupplierModal({ isOpen, onClose, supplier, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permanent, setPermanent] = useState(false);

  if (!isOpen || !supplier) return null;

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await supplierApi.deleteSupplier(supplier.supplierId, permanent);
      const message = typeof res.data === 'string' ? res.data : `Vendor #${supplier.supplierId} successfully processed.`;
      if (onSuccess) onSuccess(message);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to remove supplier.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        border: '1px solid #E2E8F0',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#FEF2F2'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#991B1B', margin: 0 }}>
                Remove / Deactivate Supplier
              </h2>
              <p style={{ fontSize: '11px', color: '#B91C1C', margin: '2px 0 0 0' }}>
                Vendor ID #{supplier.supplierId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#991B1B',
              padding: '4px',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              color: '#DC2626',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <p style={{ fontSize: '13px', color: '#334155', margin: 0 }}>
            Are you sure you want to remove <strong>{supplier.supplierName}</strong> from active operations?
          </p>

          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            padding: '12px',
            fontSize: '11.5px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            color: '#475569'
          }}>
            <div><strong>GSTIN:</strong> <span className="font-mono">{supplier.gstNo || 'N/A'}</span></div>
            <div><strong>Email:</strong> {supplier.email || 'N/A'}</div>
            <div><strong>Status:</strong> {supplier.isActive !== false ? 'Active Master' : 'Inactive'}</div>
          </div>

          <div style={{
            padding: '10px 12px',
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <input
              type="checkbox"
              id="permanentDeleteCheckbox"
              checked={permanent}
              onChange={(e) => setPermanent(e.target.checked)}
              style={{ marginTop: '3px', accentColor: '#DC2626' }}
            />
            <label htmlFor="permanentDeleteCheckbox" style={{ fontSize: '11.5px', color: '#92400E', cursor: 'pointer' }}>
              <strong>Permanent Hard Delete:</strong> Completely purge this supplier record from the database. (If unselected, the vendor is safely marked Inactive).
            </label>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="btn btn-sm"
              disabled={loading}
              style={{
                background: permanent ? '#DC2626' : '#EA580C',
                color: '#FFFFFF',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: '700'
              }}
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : permanent ? (
                <Trash2 size={14} />
              ) : (
                <PowerOff size={14} />
              )}
              {loading ? 'Processing...' : permanent ? 'Permanently Delete' : 'Deactivate Vendor'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

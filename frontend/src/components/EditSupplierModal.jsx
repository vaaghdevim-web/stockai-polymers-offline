import React, { useState, useEffect } from 'react';
import { X, Building2, ShieldCheck, Mail, Phone, MapPin, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supplierApi } from '../services/api';

export default function EditSupplierModal({ isOpen, onClose, supplier, onSuccess }) {
  const [formData, setFormData] = useState({
    supplierName: '',
    gstNo: '',
    email: '',
    phone: '',
    address: '',
    isActive: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (supplier) {
      setFormData({
        supplierName: supplier.supplierName || '',
        gstNo: supplier.gstNo || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        isActive: supplier.isActive !== false
      });
      setError(null);
    }
  }, [supplier]);

  if (!isOpen || !supplier) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplierName.trim()) {
      setError('Supplier / Vendor name is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await supplierApi.updateSupplier(supplier.supplierId, {
        supplierName: formData.supplierName.trim(),
        gstNo: formData.gstNo ? formData.gstNo.trim().toUpperCase() : null,
        email: formData.email ? formData.email.trim() : null,
        phone: formData.phone ? formData.phone.trim() : null,
        address: formData.address ? formData.address.trim() : null,
        isActive: formData.isActive
      });

      if (onSuccess) onSuccess(`Supplier #${supplier.supplierId} updated successfully.`);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update supplier.');
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
        maxWidth: '540px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#F8FAFC'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(2, 132, 199, 0.1)',
              color: 'var(--accent-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Building2 size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                Edit Supplier Details
              </h2>
              <p style={{ fontSize: '11.5px', color: '#64748B', margin: '2px 0 0 0' }}>
                Update Vendor #{supplier.supplierId} — {supplier.supplierName}
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
              color: '#64748B',
              padding: '4px',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
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

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
              Vendor / Supplier Legal Name *
            </label>
            <input
              type="text"
              name="supplierName"
              className="input"
              value={formData.supplierName}
              onChange={handleChange}
              required
              style={{ width: '100%', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                GSTIN Number
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  name="gstNo"
                  className="input font-mono"
                  placeholder="e.g. 36AAACR1234F1Z5"
                  value={formData.gstNo}
                  onChange={handleChange}
                  maxLength={15}
                  style={{ width: '100%', fontSize: '12.5px', textTransform: 'uppercase', paddingLeft: '28px' }}
                />
                <ShieldCheck size={14} color="#64748B" style={{ position: 'absolute', left: '8px', top: '10px' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                Contact Phone
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  name="phone"
                  className="input font-mono"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                  style={{ width: '100%', fontSize: '12.5px', paddingLeft: '28px' }}
                />
                <Phone size={14} color="#64748B" style={{ position: 'absolute', left: '8px', top: '10px' }} />
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
              Official Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                name="email"
                className="input"
                placeholder="procurement@vendor-domain.com"
                value={formData.email}
                onChange={handleChange}
                style={{ width: '100%', fontSize: '12.5px', paddingLeft: '28px' }}
              />
              <Mail size={14} color="#64748B" style={{ position: 'absolute', left: '8px', top: '10px' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
              Plant / Dispatch Office Address
            </label>
            <textarea
              name="address"
              className="input"
              rows={2}
              value={formData.address}
              onChange={handleChange}
              style={{ width: '100%', fontSize: '12px', resize: 'vertical' }}
            />
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '6px'
          }}>
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#1E293B' }}>Active Master Status</div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Mark vendor active or inactive for plant receipts</div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-blue)' }}
              />
            </label>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {loading ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

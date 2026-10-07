import React, { useState, useEffect } from 'react';
import { X, Building2, AlertCircle, Save } from 'lucide-react';
import { logisticsApi } from '../services/api';

export default function CustomerModal({ isOpen, onClose, customer, onSaved }) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerCode: '',
    phone: '',
    email: '',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = Boolean(customer && customer.customerId);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (customer) {
        setFormData({
          customerName: customer.customerName || '',
          customerCode: customer.customerCode || '',
          phone: customer.phone || '',
          email: customer.email || '',
          isActive: customer.isActive !== false,
        });
      } else {
        setFormData({
          customerName: '',
          customerCode: '',
          phone: '+91 ',
          email: '',
          isActive: true,
        });
      }
    }
  }, [isOpen, customer]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerName.trim()) {
      setError('Customer enterprise name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        customerName: formData.customerName.trim(),
        customerCode: formData.customerCode.trim() ? formData.customerCode.trim().toUpperCase() : null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        isActive: Boolean(formData.isActive),
      };

      if (isEdit) {
        await logisticsApi.updateCustomer(customer.customerId, payload);
      } else {
        await logisticsApi.createCustomer(payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save customer:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to save customer profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{
        background: '#FFFFFF', borderRadius: '12px', width: '100%', maxWidth: '480px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border-default)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7'
            }}>
              <Building2 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                {isEdit ? 'Edit Customer Profile' : 'Onboard Commercial Customer'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                {isEdit ? `Updating Customer #${customer.customerId}` : 'Register client enterprise for order dispatch'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{
              padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5',
              borderRadius: '8px', color: '#B91C1C', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Customer Company Name <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Supreme Industries Ltd"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              className="input"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Customer ERP Code
            </label>
            <input
              type="text"
              placeholder="e.g. CUST-SUPREME-01 (Leave empty to auto-generate)"
              value={formData.customerCode}
              onChange={(e) => setFormData({ ...formData, customerCode: e.target.value })}
              className="input font-mono"
              style={{ width: '100%', textTransform: 'uppercase' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Contact Phone
              </label>
              <input
                type="tel"
                placeholder="e.g. +91 98400 12345"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input font-mono"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Official Email
              </label>
              <input
                type="email"
                placeholder="e.g. procurement@supreme.in"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
            <input
              type="checkbox"
              id="customer-is-active"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              style={{ width: '16px', height: '16px' }}
            />
            <label htmlFor="customer-is-active" style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', cursor: 'pointer' }}>
              Active Commercial Account (Eligible for Orders & Dispatches)
            </label>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: '8px',
            marginTop: '10px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)'
          }}>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm" disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting} style={{ background: '#0284C7', borderColor: '#0284C7' }}>
              <Save size={13} />
              <span>{submitting ? 'Saving...' : isEdit ? 'Update Customer' : 'Onboard Customer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

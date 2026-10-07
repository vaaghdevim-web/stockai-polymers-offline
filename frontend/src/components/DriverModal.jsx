import React, { useState, useEffect } from 'react';
import { X, User, AlertCircle, Save } from 'lucide-react';
import { logisticsApi } from '../services/api';

export default function DriverModal({ isOpen, onClose, driver, onSaved }) {
  const [formData, setFormData] = useState({
    driverName: '',
    licenseNumber: '',
    licenseExpiry: '',
    phone: '',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = Boolean(driver && driver.driverId);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (driver) {
        setFormData({
          driverName: driver.driverName || '',
          licenseNumber: driver.licenseNumber || '',
          licenseExpiry: driver.licenseExpiry ? driver.licenseExpiry.slice(0, 10) : '',
          phone: driver.phone || '',
          isActive: driver.isActive !== false,
        });
      } else {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 3);
        setFormData({
          driverName: '',
          licenseNumber: '',
          licenseExpiry: futureDate.toISOString().slice(0, 10),
          phone: '+91 ',
          isActive: true,
        });
      }
    }
  }, [isOpen, driver]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.driverName.trim()) {
      setError('Driver full name is required.');
      return;
    }
    if (!formData.licenseNumber.trim()) {
      setError('Commercial driving license number is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        driverName: formData.driverName.trim(),
        licenseNumber: formData.licenseNumber.trim().toUpperCase(),
        licenseExpiry: formData.licenseExpiry || null,
        phone: formData.phone.trim(),
        isActive: Boolean(formData.isActive),
      };

      if (isEdit) {
        await logisticsApi.updateDriver(driver.driverId, payload);
      } else {
        await logisticsApi.createDriver(payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save driver:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to save driver record.');
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
              <User size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                {isEdit ? 'Edit Driver Record' : 'Enrol Commercial Driver'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                {isEdit ? `Updating Driver #${driver.driverId}` : 'Add verified driver to logistics roster'}
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
              Driver Full Name <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. S. Murugesan"
              value={formData.driverName}
              onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
              className="input"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                License Number <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. TN-05-2018-98124"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                className="input font-mono"
                style={{ width: '100%', textTransform: 'uppercase' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                License Expiry Date
              </label>
              <input
                type="date"
                value={formData.licenseExpiry}
                onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                className="input font-mono"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Contact Phone Number
            </label>
            <input
              type="tel"
              placeholder="e.g. +91 98421 77210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input font-mono"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
            <input
              type="checkbox"
              id="driver-is-active"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              style={{ width: '16px', height: '16px' }}
            />
            <label htmlFor="driver-is-active" style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', cursor: 'pointer' }}>
              On-Roster Status (Available for Dispatch Assignment)
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
              <span>{submitting ? 'Saving...' : isEdit ? 'Update Driver' : 'Enrol Driver'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

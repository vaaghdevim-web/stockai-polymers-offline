import React, { useState, useEffect } from 'react';
import { X, Truck, AlertCircle, Save } from 'lucide-react';
import { logisticsApi } from '../services/api';

export default function VehicleModal({ isOpen, onClose, vehicle, onSaved }) {
  const [formData, setFormData] = useState({
    vehicleNumber: '',
    vehicleType: 'Heavy Commercial Truck',
    capacity: '20',
    capacityUomCode: 'TONNES',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = Boolean(vehicle && vehicle.vehicleId);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (vehicle) {
        setFormData({
          vehicleNumber: vehicle.vehicleNumber || '',
          vehicleType: vehicle.vehicleType || 'Heavy Commercial Truck',
          capacity: vehicle.capacity ? String(vehicle.capacity) : '20',
          capacityUomCode: vehicle.capacityUomCode || 'TONNES',
          isActive: vehicle.isActive !== false,
        });
      } else {
        setFormData({
          vehicleNumber: '',
          vehicleType: 'Heavy Commercial Truck',
          capacity: '20',
          capacityUomCode: 'TONNES',
          isActive: true,
        });
      }
    }
  }, [isOpen, vehicle]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vehicleNumber.trim()) {
      setError('Vehicle registration number is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        vehicleNumber: formData.vehicleNumber.trim().toUpperCase(),
        vehicleType: formData.vehicleType.trim(),
        capacity: parseFloat(formData.capacity) || 0,
        capacityUomCode: formData.capacityUomCode || 'TONNES',
        isActive: Boolean(formData.isActive),
      };

      if (isEdit) {
        await logisticsApi.updateVehicle(vehicle.vehicleId, payload);
      } else {
        await logisticsApi.createVehicle(payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save vehicle:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to save vehicle record.');
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
              <Truck size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                {isEdit ? 'Edit Fleet Vehicle' : 'Register New Fleet Vehicle'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                {isEdit ? `Updating Vehicle #${vehicle.vehicleId}` : 'Add transport truck to logistics repository'}
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
              Registration Number <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. TN-28-AB-9812"
              value={formData.vehicleNumber}
              onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
              className="input font-mono"
              style={{ width: '100%', textTransform: 'uppercase' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Vehicle Type / Category
            </label>
            <input
              type="text"
              placeholder="e.g. Heavy Commercial Truck, 16-Wheeler Multi-Axle"
              value={formData.vehicleType}
              onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
              className="input"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Max Payload Capacity
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                className="input font-mono"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Capacity UOM
              </label>
              <select
                value={formData.capacityUomCode}
                onChange={(e) => setFormData({ ...formData, capacityUomCode: e.target.value })}
                className="input"
                style={{ width: '100%' }}
              >
                <option value="TONNES">TONNES (Metric)</option>
                <option value="KG">KILOGRAMS (KG)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
            <input
              type="checkbox"
              id="vehicle-is-active"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              style={{ width: '16px', height: '16px' }}
            />
            <label htmlFor="vehicle-is-active" style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', cursor: 'pointer' }}>
              Active / Operational Status (Available for Dispatch)
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
              <span>{submitting ? 'Saving...' : isEdit ? 'Update Vehicle' : 'Register Vehicle'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

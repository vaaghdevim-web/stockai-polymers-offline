import React, { useState, useEffect } from 'react';
import { X, Building2, AlertCircle, Save, CheckCircle2 } from 'lucide-react';
import { getPlants, updateWarehouse, extractErrorMessage } from '../services/domain/warehouseService';
import { formatPlantName } from '../utils/brand';

export default function EditWarehouseModal({ isOpen, warehouse, onClose, onWarehouseUpdated }) {
  const [plants, setPlants] = useState([]);
  const [plantId, setPlantId] = useState('');
  const [warehouseName, setWarehouseName] = useState('');
  const [type, setType] = useState('Raw');
  const [isActive, setIsActive] = useState(true);
  const [loadingPlants, setLoadingPlants] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !warehouse) return;

    let isMounted = true;
    const fetchPlants = async () => {
      try {
        setLoadingPlants(true);
        setError(null);
        const res = await getPlants();
        const list = Array.isArray(res.data) ? res.data : [];
        if (isMounted) {
          setPlants(list);
        }
      } catch (err) {
        if (isMounted) {
          setError(extractErrorMessage(err, 'Failed to retrieve manufacturing plants.'));
        }
      } finally {
        if (isMounted) setLoadingPlants(false);
      }
    };

    fetchPlants();
    setWarehouseName(warehouse.warehouseName || '');
    setPlantId(warehouse.plantId ? String(warehouse.plantId) : '');
    setType(warehouse.type || 'Raw');
    setIsActive(warehouse.isActive !== undefined ? Boolean(warehouse.isActive) : true);
  }, [isOpen, warehouse]);

  if (!isOpen || !warehouse) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!warehouseName.trim()) {
      setError('Warehouse name is required.');
      return;
    }
    if (!plantId) {
      setError('Please select a manufacturing plant.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await updateWarehouse(warehouse.warehouseId, {
        plantId: Number(plantId),
        warehouseName: warehouseName.trim(),
        type,
        isActive,
      });

      if (onWarehouseUpdated) {
        onWarehouseUpdated(res.data || {
          ...warehouse,
          plantId: Number(plantId),
          warehouseName: warehouseName.trim(),
          type,
          isActive,
        });
      }
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update warehouse.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', padding: '22px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
              Edit Warehouse Details
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Plant Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Manufacturing Plant <span style={{ color: 'var(--accent-coral)' }}>*</span>
            </label>
            <select
              value={plantId}
              onChange={(e) => setPlantId(e.target.value)}
              disabled={loadingPlants || submitting}
              className="input-field"
              style={{ width: '100%' }}
              required
            >
              {loadingPlants ? (
                <option value="">Loading plants...</option>
              ) : plants.length === 0 ? (
                <option value="">No plants available</option>
              ) : (
                plants.map((p) => (
                  <option key={p.plantId} value={p.plantId}>
                    {formatPlantName(p.plantName)} ({p.city || 'Factory'})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Warehouse Name */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Warehouse Name <span style={{ color: 'var(--accent-coral)' }}>*</span>
            </label>
            <input
              type="text"
              value={warehouseName}
              onChange={(e) => setWarehouseName(e.target.value)}
              placeholder="e.g. Unit 1 Finished Goods Depot"
              className="input-field"
              style={{ width: '100%' }}
              disabled={submitting}
              required
            />
          </div>

          {/* Storage Type */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Storage Type <span style={{ color: 'var(--accent-coral)' }}>*</span>
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={submitting}
              className="input-field"
              style={{ width: '100%' }}
            >
              <option value="Raw">Raw Materials</option>
              <option value="FG">Finished Goods</option>
              <option value="Both">Multi-purpose / Both</option>
            </select>
          </div>

          {/* Active Facility Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={submitting}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-cyan)' }}
              />
              Active Facility
            </label>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loadingPlants}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {submitting ? (
                <>Saving...</>
              ) : (
                <>
                  <Save size={14} /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

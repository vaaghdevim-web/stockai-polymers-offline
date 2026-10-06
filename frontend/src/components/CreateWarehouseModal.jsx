import React, { useState, useEffect } from 'react';
import { X, Building2, AlertCircle, Plus, CheckCircle2 } from 'lucide-react';
import { getPlants, createWarehouse, extractErrorMessage } from '../services/domain/warehouseService';
import { formatPlantName } from '../utils/brand';

export default function CreateWarehouseModal({ isOpen, onClose, onWarehouseCreated }) {
  const [plants, setPlants] = useState([]);
  const [plantId, setPlantId] = useState('');
  const [warehouseName, setWarehouseName] = useState('');
  const [type, setType] = useState('Raw');
  const [isActive, setIsActive] = useState(true);
  const [loadingPlants, setLoadingPlants] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchPlants = async () => {
      try {
        setLoadingPlants(true);
        setError(null);
        const res = await getPlants();
        const list = Array.isArray(res.data) ? res.data : [];
        if (isMounted) {
          setPlants(list);
          if (list.length > 0) {
            setPlantId(String(list[0].plantId));
          }
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
    setWarehouseName('');
    setType('Raw');
    setIsActive(true);
  }, [isOpen]);

  if (!isOpen) return null;

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

      const res = await createWarehouse({
        plantId: Number(plantId),
        warehouseName: warehouseName.trim(),
        type,
        isActive,
      });

      if (onWarehouseCreated) {
        onWarehouseCreated(res.data);
      }
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to create warehouse.'));
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
              Create New Warehouse
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
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Manufacturing Plant *
            </label>
            <select
              className="select"
              value={plantId}
              onChange={(e) => {
                setPlantId(e.target.value);
                setError(null);
              }}
              disabled={loadingPlants}
              required
            >
              {loadingPlants ? (
                <option value="">Loading manufacturing plants...</option>
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
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Warehouse Name *
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Unit 1 Finished Goods Depot"
              value={warehouseName}
              onChange={(e) => {
                setWarehouseName(e.target.value);
                setError(null);
              }}
              required
            />
          </div>

          {/* Warehouse Type & Active Toggle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Storage Type *
              </label>
              <select
                className="select"
                value={type}
                onChange={(e) => setType(e.target.value)}
                required
              >
                <option value="Raw">Raw Materials</option>
                <option value="FG">Finished Goods</option>
                <option value="Both">Both (Multi-Purpose)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '18px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-cyan)' }}
                />
                <span style={{ fontWeight: '600' }}>Active Facility</span>
              </label>
            </div>
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
              disabled={submitting || loadingPlants}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {submitting ? 'Creating...' : (
                <>
                  <Plus size={14} /> Create Warehouse
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

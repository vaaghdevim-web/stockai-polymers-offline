import React, { useState, useEffect } from 'react';
import { X, Award, Check, AlertCircle, Loader2 } from 'lucide-react';
import { qualityApi, finishedGoodsApi } from '../services/api';

const PRESET_PARAMETERS = [
  { name: 'ASTM D1238 Melt Flow Index (MFI)', unit: 'g/10min', type: 'Incoming', min: '2.5', max: '3.5', target: '3.0' },
  { name: 'Pycnometer Specific Density', unit: 'g/cm³', type: 'Incoming', min: '0.900', max: '0.915', target: '0.905' },
  { name: 'Calcium Carbonate Ash Content', unit: '%', type: 'Incoming', min: '78.0', max: '82.0', target: '80.0' },
  { name: 'Tape Denier / Linear Density', unit: 'Denier', type: 'InProcess', min: '750', max: '850', target: '800' },
  { name: 'Tape Tensile Tenacity', unit: 'g/denier', type: 'InProcess', min: '4.8', max: '6.0', target: '5.2' },
  { name: 'Tape Elongation at Break', unit: '%', type: 'InProcess', min: '18.0', max: '25.0', target: '20.0' },
  { name: 'Fabric Grammage (GSM)', unit: 'GSM', type: 'Final', min: '65.0', max: '75.0', target: '70.0' },
  { name: 'Tensile Breaking Force - Warp', unit: 'kgf', type: 'Final', min: '80.0', max: '110.0', target: '95.0' },
  { name: 'Tensile Breaking Force - Weft', unit: 'kgf', type: 'Final', min: '75.0', max: '105.0', target: '90.0' },
  { name: 'Dart Impact Puncture Strength', unit: 'grams', type: 'Final', min: '180.0', max: '240.0', target: '210.0' }
];

export default function CreateQcSpecificationModal({
  isOpen,
  onClose,
  onSpecSaved,
  editSpec = null
}) {
  const [formData, setFormData] = useState({
    productId: '',
    inspectionType: 'Final',
    parameterName: '',
    minimumValue: '',
    maximumValue: '',
    targetValue: '',
    measurementUnit: 'GSM',
    specification: '',
    isCritical: false,
    isActive: true
  });

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    finishedGoodsApi.getProducts().then(res => {
      setProducts(res.data || []);
    }).catch(() => {});

    if (editSpec) {
      setFormData({
        productId: editSpec.productId ? String(editSpec.productId) : '',
        inspectionType: editSpec.inspectionType || 'Final',
        parameterName: editSpec.parameterName || '',
        minimumValue: editSpec.minimumValue != null ? String(editSpec.minimumValue) : '',
        maximumValue: editSpec.maximumValue != null ? String(editSpec.maximumValue) : '',
        targetValue: editSpec.targetValue != null ? String(editSpec.targetValue) : '',
        measurementUnit: editSpec.measurementUnit || '',
        specification: editSpec.specification || '',
        isCritical: editSpec.isCritical ?? false,
        isActive: editSpec.isActive ?? true
      });
    } else {
      setFormData({
        productId: '',
        inspectionType: 'Final',
        parameterName: '',
        minimumValue: '',
        maximumValue: '',
        targetValue: '',
        measurementUnit: 'GSM',
        specification: '',
        isCritical: false,
        isActive: true
      });
    }
    setError(null);
  }, [isOpen, editSpec]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset) => {
    setFormData(prev => ({
      ...prev,
      parameterName: preset.name,
      measurementUnit: preset.unit,
      inspectionType: preset.type,
      minimumValue: preset.min,
      maximumValue: preset.max,
      targetValue: preset.target
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.parameterName.trim()) {
      setError('Please provide a QC parameter name');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        productId: formData.productId ? Number(formData.productId) : null,
        inspectionType: formData.inspectionType,
        parameterName: formData.parameterName.trim(),
        minimumValue: formData.minimumValue ? parseFloat(formData.minimumValue) : null,
        maximumValue: formData.maximumValue ? parseFloat(formData.maximumValue) : null,
        targetValue: formData.targetValue ? parseFloat(formData.targetValue) : null,
        measurementUnit: formData.measurementUnit?.trim() || null,
        specification: formData.specification?.trim() || null,
        isCritical: formData.isCritical,
        isActive: formData.isActive
      };

      if (editSpec && editSpec.qcSpecificationId) {
        await qualityApi.updateSpecification(editSpec.qcSpecificationId, payload);
      } else {
        await qualityApi.createSpecification(payload);
      }

      if (onSpecSaved) onSpecSaved();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save QC specification.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px', padding: '24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={20} color="#0284C7" />
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {editSpec ? 'Edit QC Test Parameter' : 'Define QC Test Parameter'}
            </h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            background: 'var(--accent-coral-light)',
            border: '1px solid var(--accent-coral-border)',
            borderRadius: '6px',
            color: 'var(--accent-coral-text)',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Preset Badges (When creating new) */}
        {!editSpec && (
          <div style={{ marginBottom: '14px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Quick Presets:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {PRESET_PARAMETERS.slice(0, 5).map(p => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className="btn btn-secondary btn-xs"
                  style={{ fontSize: '11px', padding: '2px 8px' }}
                >
                  {p.name.split(' ')[0]} ({p.unit})
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Inspection Stage *
              </label>
              <select
                className="input input-sm"
                value={formData.inspectionType}
                onChange={(e) => setFormData({ ...formData, inspectionType: e.target.value })}
                style={{ width: '100%' }}
              >
                <option value="Incoming">Incoming (Raw Material Receipts)</option>
                <option value="InProcess">InProcess (Compounding & Extrusion)</option>
                <option value="Final">Final (Finished Product Bags/Rolls)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Applicable Product SKU
              </label>
              <select
                className="input input-sm"
                value={formData.productId}
                onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                style={{ width: '100%' }}
              >
                <option value="">Global / All Products</option>
                {products.map(p => (
                  <option key={p.productId} value={p.productId}>
                    {p.productCode} — {p.productName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Parameter / Test Standard Name *
            </label>
            <input
              type="text"
              required
              className="input input-sm"
              placeholder="e.g. ASTM D1238 Melt Flow Index (MFI) @ 230°C/2.16kg"
              value={formData.parameterName}
              onChange={(e) => setFormData({ ...formData, parameterName: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Min Tolerable
              </label>
              <input
                type="number"
                step="0.001"
                className="input input-sm font-mono"
                placeholder="e.g. 2.5"
                value={formData.minimumValue}
                onChange={(e) => setFormData({ ...formData, minimumValue: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Target Spec
              </label>
              <input
                type="number"
                step="0.001"
                className="input input-sm font-mono"
                placeholder="e.g. 3.0"
                value={formData.targetValue}
                onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Max Tolerable
              </label>
              <input
                type="number"
                step="0.001"
                className="input input-sm font-mono"
                placeholder="e.g. 3.5"
                value={formData.maximumValue}
                onChange={(e) => setFormData({ ...formData, maximumValue: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Unit
              </label>
              <input
                type="text"
                className="input input-sm"
                placeholder="e.g. g/10min"
                value={formData.measurementUnit}
                onChange={(e) => setFormData({ ...formData, measurementUnit: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Standard Reference / Notes
            </label>
            <textarea
              className="input input-sm"
              rows={2}
              placeholder="e.g. Tested as per IS 14887:2014 standards with 10 random sample test coupons"
              value={formData.specification}
              onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
              style={{ width: '100%', resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <input
              type="checkbox"
              id="critical-qc-toggle"
              checked={formData.isCritical}
              onChange={(e) => setFormData({ ...formData, isCritical: e.target.checked })}
              style={{ accentColor: '#0284C7', cursor: 'pointer' }}
            />
            <label htmlFor="critical-qc-toggle" style={{ fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer' }}>
              <strong>Critical Safety & Quality Parameter</strong> (Out of tolerance results automatically trigger batch rejection / quarantine)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check size={13} /> {editSpec ? 'Update QC Parameter' : 'Save QC Parameter'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

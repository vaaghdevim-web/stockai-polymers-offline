import React, { useState, useEffect } from 'react';
import { X, Boxes, AlertCircle, Plus, Layers, Tag, DollarSign, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { createRawMaterial, getMaterialCategories, getMaterialUoms, extractErrorMessage } from '../services/domain/rawMaterialsService';

export default function CreateRawMaterialModal({ isOpen, onClose, onMaterialCreated }) {
  const [materialName, setMaterialName] = useState('');
  const [materialCode, setMaterialCode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [defaultUomId, setDefaultUomId] = useState('');
  const [standardCost, setStandardCost] = useState('110.00');
  const [reorderLevel, setReorderLevel] = useState('5000');
  const [safetyStock, setSafetyStock] = useState('2000');
  const [leadTimeDays, setLeadTimeDays] = useState('7');

  const [categories, setCategories] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchMetadata = async () => {
      try {
        setLoadingMeta(true);
        setError(null);

        const [catRes, uomRes] = await Promise.allSettled([
          getMaterialCategories(),
          getMaterialUoms()
        ]);

        if (isMounted) {
          if (catRes.status === 'fulfilled' && Array.isArray(catRes.value.data) && catRes.value.data.length > 0) {
            setCategories(catRes.value.data);
            setCategoryId(String(catRes.value.data[0].categoryId));
          } else {
            // Default fallback polymer categories
            const defaultCats = [
              { categoryId: 1, categoryName: 'PP Granules / Resin' },
              { categoryId: 2, categoryName: 'Calcium Carbonate Filler' },
              { categoryId: 3, categoryName: 'Color Masterbatch' },
              { categoryId: 4, categoryName: 'Additives & Stabilizers' }
            ];
            setCategories(defaultCats);
            setCategoryId(String(defaultCats[0].categoryId));
          }

          if (uomRes.status === 'fulfilled' && Array.isArray(uomRes.value.data) && uomRes.value.data.length > 0) {
            setUoms(uomRes.value.data);
            setDefaultUomId(String(uomRes.value.data[0].uomId));
          } else {
            const defaultUoms = [
              { uomId: 1, uomCode: 'KG', uomName: 'Kilograms' },
              { uomId: 2, uomCode: 'MT', uomName: 'Metric Tons' }
            ];
            setUoms(defaultUoms);
            setDefaultUomId(String(defaultUoms[0].uomId));
          }
        }
      } catch {
        // Handled silently
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    };

    fetchMetadata();
    setMaterialName('');
    setMaterialCode('');
    setStandardCost('110.00');
    setReorderLevel('5000');
    setSafetyStock('2000');
    setLeadTimeDays('7');
    setError(null);
  }, [isOpen]);

  // Auto-generate material code based on name if not typed manually
  const handleNameChange = (e) => {
    const val = e.target.value;
    setMaterialName(val);
    const sanitized = val.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-');
    setMaterialCode(sanitized ? `RM-${sanitized}` : '');
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!materialName.trim()) {
      setError('Material Name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        materialName: materialName.trim(),
        materialCode: materialCode.trim() || undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        defaultUomId: defaultUomId ? Number(defaultUomId) : undefined,
        standardCost: Number(standardCost) || 0,
        reorderLevel: Number(reorderLevel) || 5000,
        safetyStock: Number(safetyStock) || 2000,
        leadTimeDays: Number(leadTimeDays) || 7,
      };

      const res = await createRawMaterial(payload);

      if (onMaterialCreated) {
        onMaterialCreated(res.data);
      }
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to define new raw material.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px', padding: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(0, 210, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Boxes size={18} color="var(--accent-cyan)" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                Define New Raw Material SKU
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                Register new polymer resin, filler, or additive into factory catalog
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Material Name */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Material Name <span style={{ color: 'var(--accent-coral)' }}>*</span>
            </label>
            <input
              type="text"
              value={materialName}
              onChange={handleNameChange}
              placeholder="e.g. PP Homopolymer H030SG (Reliance)"
              className="input-field"
              style={{ width: '100%' }}
              disabled={submitting}
              required
            />
          </div>

          {/* Material Code & Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Material Code (SKU)
              </label>
              <input
                type="text"
                value={materialCode}
                onChange={(e) => setMaterialCode(e.target.value)}
                placeholder="e.g. RM-PP-H030SG"
                className="input-field font-mono"
                style={{ width: '100%' }}
                disabled={submitting}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={submitting || loadingMeta}
                className="input-field"
                style={{ width: '100%' }}
              >
                {categories.map((c) => (
                  <option key={c.categoryId} value={c.categoryId}>
                    {c.categoryName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Unit of Measure & Standard Cost */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Unit of Measure (UOM)
              </label>
              <select
                value={defaultUomId}
                onChange={(e) => setDefaultUomId(e.target.value)}
                disabled={submitting || loadingMeta}
                className="input-field"
                style={{ width: '100%' }}
              >
                {uoms.map((u) => (
                  <option key={u.uomId} value={u.uomId}>
                    {u.uomCode} ({u.uomName || u.uomCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Standard Cost (₹ / UOM)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={standardCost}
                onChange={(e) => setStandardCost(e.target.value)}
                placeholder="110.00"
                className="input-field font-mono"
                style={{ width: '100%' }}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Inventory Safety & Reorder Thresholds */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Reorder Point (KG)
              </label>
              <input
                type="number"
                min="0"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                placeholder="5000"
                className="input-field font-mono"
                style={{ width: '100%' }}
                disabled={submitting}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Safety Stock (KG)
              </label>
              <input
                type="number"
                min="0"
                value={safetyStock}
                onChange={(e) => setSafetyStock(e.target.value)}
                placeholder="2000"
                className="input-field font-mono"
                style={{ width: '100%' }}
                disabled={submitting}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Lead Time (Days)
              </label>
              <input
                type="number"
                min="1"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                placeholder="7"
                className="input-field font-mono"
                style={{ width: '100%' }}
                disabled={submitting}
              />
            </div>
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
              disabled={submitting}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {submitting ? (
                <>Registering...</>
              ) : (
                <>
                  <Plus size={14} /> Define Raw Material
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

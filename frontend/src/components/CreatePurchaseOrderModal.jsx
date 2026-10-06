import React, { useState, useEffect } from 'react';
import { X, FileCheck, Plus, Trash2, AlertTriangle, Building2, ShoppingBag } from 'lucide-react';
import { procurementApi, supplierApi, inventoryApi } from '../services/api';

export default function CreatePurchaseOrderModal({ isOpen, onClose, onSuccess, initialRecommendation = null }) {
  const [suppliers, setSuppliers] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState([
    { materialId: '', quantity: 1000, rate: 110 }
  ]);
  const [status, setStatus] = useState('Draft');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadFormData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [supRes, matRes] = await Promise.all([
          supplierApi.getSuppliers(true),
          inventoryApi.getRawMaterials(),
        ]);

        if (isMounted) {
          const supList = Array.isArray(supRes.data) ? supRes.data : [];
          const matList = Array.isArray(matRes.data) ? matRes.data : [];
          setSuppliers(supList);
          setRawMaterials(matList);

          if (supList.length > 0) {
            setSelectedSupplierId(supList[0].supplierId);
          }

          if (initialRecommendation) {
            const mat = matList.find(m => m.materialId === initialRecommendation.materialId);
            const rate = mat?.standardCost ? Number(mat.standardCost) : 105;
            setItems([
              {
                materialId: initialRecommendation.materialId,
                quantity: initialRecommendation.recommendedQty || 1000,
                rate: rate,
              }
            ]);
          } else if (matList.length > 0) {
            setItems([
              {
                materialId: matList[0].materialId,
                quantity: 1000,
                rate: matList[0].standardCost ? Number(matList[0].standardCost) : 105,
              }
            ]);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || err.message || 'Failed to load suppliers/materials');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadFormData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, initialRecommendation]);

  if (!isOpen) return null;

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    if (field === 'materialId') {
      const mat = rawMaterials.find(m => String(m.materialId) === String(value));
      updated[index] = {
        ...updated[index],
        materialId: value,
        rate: mat?.standardCost ? Number(mat.standardCost) : updated[index].rate,
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
    }
    setItems(updated);
  };

  const addItem = () => {
    if (rawMaterials.length === 0) return;
    setItems([
      ...items,
      {
        materialId: rawMaterials[0].materialId,
        quantity: 1000,
        rate: rawMaterials[0].standardCost ? Number(rawMaterials[0].standardCost) : 105,
      }
    ]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const totalPoValue = items.reduce((sum, item) => {
    const q = parseFloat(item.quantity) || 0;
    const r = parseFloat(item.rate) || 0;
    return sum + (q * r);
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!selectedSupplierId) {
      setError('Please select a vendor/supplier');
      return;
    }

    if (items.length === 0 || items.some(it => !it.materialId || it.quantity <= 0)) {
      setError('Please ensure all items have a valid material and quantity greater than 0.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        supplierId: Number(selectedSupplierId),
        plantId: initialRecommendation?.plantId || null,
        poDate: poDate,
        recommendationId: initialRecommendation?.recommendationId || null,
        status: status,
        items: items.map(item => ({
          materialId: Number(item.materialId),
          quantity: parseFloat(item.quantity),
          rate: parseFloat(item.rate || 0),
        })),
      };

      await procurementApi.createPurchaseOrder(payload);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create Purchase Order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCheck size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
              {initialRecommendation ? `Convert Rec #${initialRecommendation.recommendationId} to Formal PO` : 'Create Formal Purchase Order (PO)'}
            </h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {initialRecommendation && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(0, 210, 255, 0.08)',
            border: '1px solid rgba(0, 210, 255, 0.25)',
            borderRadius: 'var(--radius-xs)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <ShoppingBag size={14} color="var(--accent-cyan)" />
            <span>
              Pre-filled from Recommendation <strong>#{initialRecommendation.recommendationId}</strong> ({initialRecommendation.materialName} - {initialRecommendation.recommendedQty} kg)
            </span>
          </div>
        )}

        {error && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-coral)',
            fontSize: '12px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Target Vendor / Supplier *
              </label>
              <select
                className="select"
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                required
                disabled={loading}
              >
                {suppliers.map(s => (
                  <option key={s.supplierId} value={s.supplierId}>
                    {s.supplierName} ({s.supplierCode || `ID #${s.supplierId}`})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                PO Issue Date *
              </label>
              <input
                type="date"
                className="input font-mono"
                value={poDate}
                onChange={(e) => setPoDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              Procurement Line Items
            </span>
            <button type="button" onClick={addItem} className="btn btn-ghost btn-xs">
              <Plus size={12} /> Add Item
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
            {items.map((item, idx) => {
              const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
              return (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 32px',
                    gap: '8px',
                    alignItems: 'center',
                    background: 'var(--bg-surface)',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <label style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', fontFamily: 'var(--font-mono)' }}>MATERIAL</label>
                    <select
                      className="select"
                      style={{ fontSize: '11px', padding: '4px 6px' }}
                      value={item.materialId}
                      onChange={(e) => handleItemChange(idx, 'materialId', e.target.value)}
                      required
                    >
                      {rawMaterials.map(m => (
                        <option key={m.materialId} value={m.materialId}>
                          {m.materialCode} - {m.materialName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', fontFamily: 'var(--font-mono)' }}>QTY (KG)</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      className="input font-mono"
                      style={{ fontSize: '11px', padding: '4px 6px' }}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', fontFamily: 'var(--font-mono)' }}>RATE (₹/KG)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input font-mono"
                      style={{ fontSize: '11px', padding: '4px 6px' }}
                      value={item.rate}
                      onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', fontFamily: 'var(--font-mono)' }}>TOTAL (₹)</label>
                    <div className="font-mono" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-green)', padding: '4px 0' }}>
                      ₹{itemTotal.toLocaleString()}
                    </div>
                  </div>

                  <div style={{ paddingTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      disabled={items.length <= 1}
                      className="btn btn-ghost btn-xs"
                      style={{ color: 'var(--accent-coral)', padding: '4px' }}
                      title="Remove item"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xs)',
          }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', fontFamily: 'var(--font-mono)' }}>INITIAL STATUS</label>
              <select
                className="select"
                style={{ fontSize: '11px', padding: '2px 8px', marginTop: '2px' }}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Draft">Draft PO</option>
                <option value="Approved">Approved PO</option>
              </select>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Grand Total</span>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>
                ₹{totalPoValue.toLocaleString()}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting || loading} className="btn btn-primary" style={{ flex: 1 }}>
              {submitting ? 'Creating Purchase Order...' : 'Generate Purchase Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

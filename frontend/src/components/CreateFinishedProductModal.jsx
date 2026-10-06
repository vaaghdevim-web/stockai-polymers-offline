import React, { useState, useEffect } from 'react';
import { X, Package, Check, AlertCircle, Loader2 } from 'lucide-react';
import { finishedGoodsApi, inventoryApi } from '../services/api';

const DEFAULT_CATEGORIES = [
  'PP Woven Sacks',
  'FIBC Jumbo Bags',
  'BOPP Laminated Sacks',
  'Leno Mesh Bags',
  'BOPP Printed Rolls',
  'HDPE Tarpaulins'
];

const DEFAULT_UOMS = [
  { uomCode: 'BAGS', uomType: 'Quantity' },
  { uomCode: 'PCS', uomType: 'Quantity' },
  { uomCode: 'ROLLS', uomType: 'Quantity' },
  { uomCode: 'METERS', uomType: 'Length' },
  { uomCode: 'KGS', uomType: 'Weight' }
];

export default function CreateFinishedProductModal({
  isOpen,
  onClose,
  onProductSaved,
  editProduct = null
}) {
  const [formData, setFormData] = useState({
    productName: '',
    productCode: '',
    categoryName: 'PP Woven Sacks',
    categoryId: '',
    defaultUomId: '',
    uomCode: 'BAGS',
    standardCost: '',
    sellingPrice: '',
    reorderLevel: '1000',
    isActive: true
  });

  const [categories, setCategories] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    // Fetch existing categories and UOMs
    Promise.allSettled([
      finishedGoodsApi.getCategories(),
      inventoryApi.getMaterialUoms()
    ]).then(([catRes, uomRes]) => {
      if (catRes.status === 'fulfilled' && Array.isArray(catRes.value?.data)) {
        setCategories(catRes.value.data);
      }
      if (uomRes.status === 'fulfilled' && Array.isArray(uomRes.value?.data)) {
        setUoms(uomRes.value.data);
      }
    });

    if (editProduct) {
      setFormData({
        productName: editProduct.productName || '',
        productCode: editProduct.productCode || '',
        categoryName: editProduct.categoryName || 'PP Woven Sacks',
        categoryId: editProduct.categoryId || '',
        defaultUomId: editProduct.defaultUomId || '',
        uomCode: editProduct.defaultUomCode || 'BAGS',
        standardCost: editProduct.standardCost != null ? String(editProduct.standardCost) : '',
        sellingPrice: editProduct.sellingPrice != null ? String(editProduct.sellingPrice) : '',
        reorderLevel: editProduct.reorderLevel != null ? String(editProduct.reorderLevel) : '1000',
        isActive: editProduct.isActive ?? true
      });
    } else {
      setFormData({
        productName: '',
        productCode: '',
        categoryName: 'PP Woven Sacks',
        categoryId: '',
        defaultUomId: '',
        uomCode: 'BAGS',
        standardCost: '',
        sellingPrice: '',
        reorderLevel: '1000',
        isActive: true
      });
    }
    setError(null);
  }, [isOpen, editProduct]);

  if (!isOpen) return null;

  // Auto-generate product code from product name if empty
  const handleNameChange = (e) => {
    const val = e.target.value;
    setFormData(prev => {
      let code = prev.productCode;
      if (!editProduct && (!code || code.startsWith('FP-'))) {
        const slug = val.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 16);
        code = slug ? `FP-${slug}` : '';
      }
      return { ...prev, productName: val, productCode: code };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.productName.trim()) {
      setError('Please enter a product name');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        productName: formData.productName.trim(),
        productCode: formData.productCode.trim() || undefined,
        categoryName: formData.categoryName,
        categoryId: formData.categoryId ? Number(formData.categoryId) : undefined,
        defaultUomId: formData.defaultUomId ? Number(formData.defaultUomId) : undefined,
        standardCost: formData.standardCost ? parseFloat(formData.standardCost) : 0,
        sellingPrice: formData.sellingPrice ? parseFloat(formData.sellingPrice) : 0,
        reorderLevel: formData.reorderLevel ? parseFloat(formData.reorderLevel) : 0,
        isActive: formData.isActive
      };

      if (editProduct && editProduct.productId) {
        await finishedGoodsApi.updateProduct(editProduct.productId, payload);
      } else {
        await finishedGoodsApi.createProduct(payload);
      }

      if (onProductSaved) onProductSaved();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to save finished product.';
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
        style={{ maxWidth: '580px', padding: '24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={20} color="#0284C7" />
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {editProduct ? 'Edit Finished Product SKU' : 'Define Finished Product SKU'}
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Product Name *
            </label>
            <input
              type="text"
              required
              className="input input-sm"
              placeholder="e.g. 50KG PP Fertilizer Bag (Laminated)"
              value={formData.productName}
              onChange={handleNameChange}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Product SKU Code
              </label>
              <input
                type="text"
                className="input input-sm font-mono"
                placeholder="e.g. FP-BAG-50KG-01"
                value={formData.productCode}
                onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Category
              </label>
              <input
                type="text"
                list="product-categories-list"
                className="input input-sm"
                value={formData.categoryName}
                onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                placeholder="Select or enter category"
                style={{ width: '100%' }}
              />
              <datalist id="product-categories-list">
                {DEFAULT_CATEGORIES.map(c => <option key={c} value={c} />)}
                {categories.map(c => <option key={c.categoryId || c.categoryName} value={c.categoryName} />)}
              </datalist>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Standard Cost (₹ / Unit)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input input-sm font-mono"
                placeholder="0.00"
                value={formData.standardCost}
                onChange={(e) => setFormData({ ...formData, standardCost: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Selling Price (₹ / Unit)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input input-sm font-mono"
                placeholder="0.00"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Default UOM
              </label>
              <select
                className="input input-sm"
                value={formData.defaultUomId || formData.uomCode}
                onChange={(e) => {
                  const val = e.target.value;
                  const matched = uoms.find(u => String(u.uomId) === val || u.uomCode === val);
                  setFormData({
                    ...formData,
                    defaultUomId: matched?.uomId ? String(matched.uomId) : '',
                    uomCode: matched?.uomCode || val
                  });
                }}
                style={{ width: '100%' }}
              >
                {uoms.length > 0 ? (
                  uoms.map(u => (
                    <option key={u.uomId} value={u.uomId}>
                      {u.uomCode} ({u.uomType || 'Unit'})
                    </option>
                  ))
                ) : (
                  DEFAULT_UOMS.map(u => (
                    <option key={u.uomCode} value={u.uomCode}>
                      {u.uomCode} ({u.uomType})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                FG Safety Reorder Level
              </label>
              <input
                type="number"
                step="1"
                min="0"
                className="input input-sm font-mono"
                placeholder="1000"
                value={formData.reorderLevel}
                onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
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
                  <Check size={13} /> {editProduct ? 'Update Product' : 'Register Product SKU'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

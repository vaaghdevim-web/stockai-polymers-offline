import React, { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Search, RefreshCw, Trash2, Edit2, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { finishedGoodsApi } from '../services/api';
import CreateFinishedProductModal from './CreateFinishedProductModal';

export default function FinishedGoodsCatalog() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  // Delete Confirmation State
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await finishedGoodsApi.getProducts(false);
      setProducts(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch finished products catalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    try {
      setDeleting(true);
      await finishedGoodsApi.deleteProduct(productToDelete.productId);
      setProductToDelete(null);
      fetchProducts();
    } catch (err) {
      alert(`Failed to deactivate product: ${err.response?.data?.message || err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const categories = Array.from(new Set(products.map(p => p.categoryName || 'General').filter(Boolean)));

  const filtered = products.filter(p => {
    const term = search.toLowerCase();
    const matchesSearch = !term ||
      (p.productName && p.productName.toLowerCase().includes(term)) ||
      (p.productCode && p.productCode.toLowerCase().includes(term)) ||
      (p.categoryName && p.categoryName.toLowerCase().includes(term));

    const matchesCategory = categoryFilter === 'ALL' || (p.categoryName || 'General') === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search finished products..."
              className="input input-sm"
              style={{ paddingLeft: '30px', width: '100%' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="input input-sm"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={fetchProducts}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            title="Refresh Product Catalog"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => {
              setEditProduct(null);
              setShowModal(true);
            }}
            className="btn btn-primary btn-sm"
          >
            <Plus size={14} /> Define Finished Product SKU
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--accent-coral-light)',
          border: '1px solid var(--accent-coral-border)',
          borderRadius: '8px',
          color: 'var(--accent-coral-text)',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Table Card */}
      <div className="panel-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product SKU Code</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Default UOM</th>
                <th style={{ textAlign: 'right' }}>Standard Cost</th>
                <th style={{ textAlign: 'right' }}>Selling Price</th>
                <th style={{ textAlign: 'right' }}>Safety Reorder</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.productId} style={{ opacity: p.isActive === false ? 0.6 : 1 }}>
                  <td className="font-mono" style={{ fontWeight: '600', color: '#0284C7' }}>
                    {p.productCode}
                  </td>
                  <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                    {p.productName}
                  </td>
                  <td>
                    <span className="badge badge-sky">{p.categoryName || 'General'}</span>
                  </td>
                  <td className="font-mono">{p.defaultUomCode || 'BAGS'}</td>
                  <td className="font-mono" style={{ textAlign: 'right' }}>
                    ₹{p.standardCost != null ? Number(p.standardCost).toFixed(2) : '0.00'}
                  </td>
                  <td className="font-mono" style={{ textAlign: 'right', fontWeight: '700', color: '#10B981' }}>
                    ₹{p.sellingPrice != null ? Number(p.sellingPrice).toFixed(2) : '0.00'}
                  </td>
                  <td className="font-mono" style={{ textAlign: 'right' }}>
                    {p.reorderLevel != null ? Number(p.reorderLevel).toLocaleString() : '1,000'}
                  </td>
                  <td>
                    {p.isActive !== false ? (
                      <span className="badge badge-emerald">Active</span>
                    ) : (
                      <span className="badge badge-coral">Inactive</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <button
                        onClick={() => {
                          setEditProduct(p);
                          setShowModal(true);
                        }}
                        className="btn btn-secondary btn-xs"
                        title="Edit Finished Product SKU"
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button
                        onClick={() => setProductToDelete(p)}
                        className="btn btn-secondary btn-xs"
                        style={{ color: '#EF4444', borderColor: '#FECACA', background: '#FEF2F2' }}
                        title="Deactivate / Delete Finished Product SKU"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    <Package size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: '13px' }}>No finished products found in catalog.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Finished Product Modal */}
      <CreateFinishedProductModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditProduct(null);
        }}
        onProductSaved={fetchProducts}
        editProduct={editProduct}
      />

      {/* Delete / Deactivate Confirmation Modal */}
      {productToDelete && (
        <div className="modal-backdrop" onClick={() => setProductToDelete(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', padding: '24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '8px', background: '#FEF2F2', borderRadius: '50%', color: '#EF4444' }}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Deactivate Finished Product SKU?
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Are you sure you want to deactivate{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {productToDelete.productName} ({productToDelete.productCode})
                  </strong>
                  ? It will be marked inactive and hidden from new customer orders and production schedules while preserving historical genealogy.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={deleting}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="btn btn-sm"
                style={{ background: '#EF4444', color: '#fff', border: 'none' }}
              >
                {deleting ? 'Deactivating...' : 'Confirm Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

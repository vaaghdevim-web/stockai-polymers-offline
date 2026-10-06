import React, { useState, useEffect, useCallback } from 'react';
import { Award, Plus, Search, RefreshCw, Trash2, Edit2, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { qualityApi, finishedGoodsApi } from '../services/api';
import CreateQcSpecificationModal from './CreateQcSpecificationModal';

export default function QcSpecificationsManager() {
  const [specs, setSpecs] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const [showModal, setShowModal] = useState(false);
  const [editSpec, setEditSpec] = useState(null);

  // Delete State
  const [specToDelete, setSpecToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSpecs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [specRes, prodRes] = await Promise.allSettled([
        qualityApi.getSpecifications(),
        finishedGoodsApi.getProducts()
      ]);

      if (specRes.status === 'fulfilled') {
        setSpecs(specRes.value.data || []);
      }
      if (prodRes.status === 'fulfilled') {
        setProducts(prodRes.value.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch QC specifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpecs();
  }, [fetchSpecs]);

  const handleDeleteConfirm = async () => {
    if (!specToDelete) return;
    try {
      setDeleting(true);
      await qualityApi.deleteSpecification(specToDelete.qcSpecificationId);
      setSpecToDelete(null);
      fetchSpecs();
    } catch (err) {
      alert(`Failed to delete QC specification: ${err.response?.data?.message || err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = specs.filter(s => {
    const term = search.toLowerCase();
    const matchesSearch = !term ||
      (s.parameterName && s.parameterName.toLowerCase().includes(term)) ||
      (s.productName && s.productName.toLowerCase().includes(term)) ||
      (s.productCode && s.productCode.toLowerCase().includes(term)) ||
      (s.specification && s.specification.toLowerCase().includes(term));

    const matchesType = typeFilter === 'ALL' || (s.inspectionType || '').toUpperCase() === typeFilter.toUpperCase();

    return matchesSearch && matchesType;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Filter & Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search parameters or specs..."
              className="input input-sm"
              style={{ paddingLeft: '30px', width: '100%' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="input input-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">All Inspection Stages</option>
            <option value="INCOMING">Incoming (Raw Materials)</option>
            <option value="INPROCESS">InProcess (Extrusion & Compounding)</option>
            <option value="FINAL">Final (Finished Bags & Rolls)</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={fetchSpecs}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            title="Refresh QC Specification Templates"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => {
              setEditSpec(null);
              setShowModal(true);
            }}
            className="btn btn-primary btn-sm"
          >
            <Plus size={14} /> Define QC Test Parameter
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

      {/* Specifications Table */}
      <div className="panel-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Stage</th>
                <th>Parameter / Standard Test</th>
                <th>Target Product</th>
                <th style={{ textAlign: 'right' }}>Min Tolerable</th>
                <th style={{ textAlign: 'right' }}>Target Value</th>
                <th style={{ textAlign: 'right' }}>Max Tolerable</th>
                <th>Unit</th>
                <th>Critical</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.qcSpecificationId} style={{ opacity: s.isActive === false ? 0.6 : 1 }}>
                  <td>
                    <span className={`badge ${
                      s.inspectionType === 'Incoming' ? 'badge-sky' :
                      s.inspectionType === 'InProcess' ? 'badge-amber' : 'badge-emerald'
                    }`}>
                      {s.inspectionType}
                    </span>
                  </td>
                  <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                    {s.parameterName}
                    {s.specification && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '400', marginTop: '2px' }}>
                        {s.specification}
                      </div>
                    )}
                  </td>
                  <td>
                    {s.productCode ? (
                      <span className="font-mono" style={{ color: '#0284C7', fontWeight: '600' }}>
                        {s.productCode}
                      </span>
                    ) : (
                      <span className="badge badge-secondary" style={{ fontSize: '10.5px' }}>Global (All SKUs)</span>
                    )}
                  </td>
                  <td className="font-mono" style={{ textAlign: 'right' }}>
                    {s.minimumValue != null ? s.minimumValue : '—'}
                  </td>
                  <td className="font-mono" style={{ textAlign: 'right', fontWeight: '700', color: '#0284C7' }}>
                    {s.targetValue != null ? s.targetValue : '—'}
                  </td>
                  <td className="font-mono" style={{ textAlign: 'right' }}>
                    {s.maximumValue != null ? s.maximumValue : '—'}
                  </td>
                  <td className="font-mono">{s.measurementUnit || '—'}</td>
                  <td>
                    {s.isCritical ? (
                      <span className="badge badge-coral" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <ShieldAlert size={11} /> Critical
                      </span>
                    ) : (
                      <span className="badge badge-secondary">Standard</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <button
                        onClick={() => {
                          setEditSpec(s);
                          setShowModal(true);
                        }}
                        className="btn btn-secondary btn-xs"
                        title="Edit QC Specification Parameter"
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button
                        onClick={() => setSpecToDelete(s)}
                        className="btn btn-secondary btn-xs"
                        style={{ color: '#EF4444', borderColor: '#FECACA', background: '#FEF2F2' }}
                        title="Delete QC Parameter Template"
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
                    <Award size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: '13px' }}>No QC parameters or inspection templates found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Creating / Editing QC Specification */}
      <CreateQcSpecificationModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditSpec(null);
        }}
        onSpecSaved={fetchSpecs}
        editSpec={editSpec}
      />

      {/* Delete Confirmation Modal */}
      {specToDelete && (
        <div className="modal-backdrop" onClick={() => setSpecToDelete(null)}>
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
                  Deactivate QC Parameter?
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Are you sure you want to deactivate parameter{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{specToDelete.parameterName}</strong>?
                  New inspections will no longer prompt for this test criteria, while historical certificates will remain intact.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setSpecToDelete(null)}
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

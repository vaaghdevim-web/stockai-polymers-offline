import React, { useState, useEffect } from 'react';
import { Award, Plus, RefreshCw, AlertCircle, Search, GitBranch } from 'lucide-react';
import { qualityApi } from '../services/api';
import LabTestModal from '../components/LabTestModal';
import CoaCertificateModal from '../components/CoaCertificateModal';
import BatchGenealogyModal from '../components/BatchGenealogyModal';

export default function QualityControl() {
  const [inspections, setInspections] = useState([]);
  const [showLabModal, setShowLabModal] = useState(false);
  const [selectedCoa, setSelectedCoa] = useState(null);
  const [selectedGenealogyBatch, setSelectedGenealogyBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchInspections = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await qualityApi.getInspections();
      setInspections(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch QC inspection records from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  // Filtered Inspections
  const filteredInspections = inspections.filter(qc => {
    const batchNo = (qc.materialBatchNo || qc.finishedBatchNo || qc.productionRunNumber || '').toLowerCase();
    const inspId = String(qc.inspectionId || '');
    const inspType = (qc.inspectionType || '').toUpperCase();
    const status = (qc.status || '').toUpperCase();
    const term = searchTerm.toLowerCase();

    const matchesSearch = !term || batchNo.includes(term) || inspId.includes(term);
    const matchesType = typeFilter === 'ALL' || inspType === typeFilter || inspType.includes(typeFilter);
    const matchesStatus = statusFilter === 'ALL' || status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // KPI calculations
  const totalCount = inspections.length;
  const passedCount = inspections.filter(i => i.status === 'PASSED' || i.status === 'APPROVED').length;
  const failedCount = inspections.filter(i => i.status === 'FAILED' || i.status === 'REJECTED').length;
  const passRate = totalCount > 0 ? ((passedCount / totalCount) * 100).toFixed(1) : '100.0';

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', height: '100%' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Quality Assurance & Polymer Laboratory Testing
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            ASTM D1238 MFI, Pycnometry Density, Tensile & Ash Content verification with automatic tolerance evaluation
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={fetchInspections}
            className="btn btn-secondary btn-sm"
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button 
            onClick={() => setShowLabModal(true)}
            className="btn btn-primary btn-sm"
          >
            <Plus size={13} /> Log New Lab Test
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Lab Inspections</div>
          <div className="font-mono" style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
            {totalCount}
          </div>
        </div>

        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pass Rate</div>
          <div className="font-mono" style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-emerald)', marginTop: '4px' }}>
            {passRate}%
          </div>
        </div>

        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Approved / Passed</div>
          <div className="font-mono" style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-emerald)', marginTop: '4px' }}>
            {passedCount}
          </div>
        </div>

        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Failed / Rejections</div>
          <div className="font-mono" style={{ fontSize: '20px', fontWeight: '800', color: failedCount > 0 ? 'var(--accent-coral)' : 'var(--text-muted)', marginTop: '4px' }}>
            {failedCount}
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--accent-coral)',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--bg-surface)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search by Batch No or Inspection ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none',
              width: '100%'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xs)', padding: '3px 8px', fontSize: '11.5px' }}
          >
            <option value="ALL">All Types</option>
            <option value="INCOMING">Incoming RM</option>
            <option value="IN_PROCESS">In-Process Compounding</option>
            <option value="FINAL">Final QA Product</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xs)', padding: '3px 8px', fontSize: '11.5px' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="PASSED">Passed</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* QC Test Log Grid */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Inspection ID</th>
              <th>Batch Number</th>
              <th>Inspection Type</th>
              <th>QA Inspector</th>
              <th>Inspection Date</th>
              <th>QA Verdict</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInspections.map(qc => {
              const status = qc.status || 'PASSED';
              const isPassed = status === 'PASSED' || status === 'APPROVED';
              const batchIdent = qc.materialBatchNo || qc.finishedBatchNo || qc.productionRunNumber || 'BATCH-RUN';

              return (
                <tr key={qc.inspectionId}>
                  <td className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                    #{qc.inspectionId}
                  </td>
                  <td className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>
                    {batchIdent}
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', fontWeight: '500' }}>{qc.inspectionType || 'Final QA'}</span>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {qc.inspectedByUserName || 'QA Lead'}
                  </td>
                  <td className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {qc.inspectionDate ? new Date(qc.inspectionDate).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <span className={`badge ${isPassed ? 'badge-emerald' : 'badge-coral'}`}>
                      {status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        onClick={() => setSelectedCoa(qc)}
                        className="btn btn-secondary btn-sm" 
                        style={{ padding: '3px 8px', fontSize: '11px', color: 'var(--accent-cyan)' }}
                        title="View Certificate of Analysis"
                      >
                        <Award size={12} /> View CoA
                      </button>
                      <button 
                        onClick={() => setSelectedGenealogyBatch(batchIdent)}
                        className="btn btn-secondary btn-sm" 
                        style={{ padding: '3px 8px', fontSize: '11px', color: 'var(--accent-amber)' }}
                        title="Trace Universal Genealogy"
                      >
                        <GitBranch size={12} /> Trace
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredInspections.length === 0 && !loading && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                  No quality inspection records matching criteria found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <LabTestModal
        isOpen={showLabModal}
        onClose={() => setShowLabModal(false)}
        onInspectionAdded={fetchInspections}
      />

      <CoaCertificateModal
        isOpen={!!selectedCoa}
        inspection={selectedCoa}
        onClose={() => setSelectedCoa(null)}
      />

      <BatchGenealogyModal
        isOpen={!!selectedGenealogyBatch}
        batchCode={selectedGenealogyBatch || ''}
        onClose={() => setSelectedGenealogyBatch(null)}
      />
    </div>
  );
}

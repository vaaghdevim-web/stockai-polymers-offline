import React, { useState, useEffect, useCallback } from 'react';
import { stockTransferApi } from '../services/api';
import { 
  ArrowRightLeft, 
  Plus, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Layers, 
  Eye, 
  X,
  Calendar,
  User,
  Check
} from 'lucide-react';
import CreateStockTransferModal from '../components/CreateStockTransferModal';

export default function StockTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [completingId, setCompletingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchTransfers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const statusParam = statusFilter !== 'ALL' ? statusFilter : null;
      const res = await stockTransferApi.getTransfers(statusParam);
      setTransfers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load stock transfers from backend.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const handleCompleteTransfer = async (transferId) => {
    try {
      setCompletingId(transferId);
      setError(null);
      setActionSuccess(null);
      await stockTransferApi.completeTransfer(transferId);
      setActionSuccess(`Transfer #${transferId} completed successfully. Inventory movements recorded.`);
      await fetchTransfers();
      if (selectedTransfer && selectedTransfer.transferId === transferId) {
        const updated = await stockTransferApi.getTransferById(transferId);
        setSelectedTransfer(updated.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || `Failed to complete transfer #${transferId}`);
    } finally {
      setCompletingId(null);
    }
  };

  const handleCancelTransfer = async (transferId) => {
    if (!window.confirm(`Are you sure you want to cancel Transfer #${transferId}? Any reserved stock allocations will be reverted.`)) {
      return;
    }
    try {
      setCancellingId(transferId);
      setError(null);
      setActionSuccess(null);
      await stockTransferApi.cancelTransfer(transferId);
      setActionSuccess(`Transfer #${transferId} cancelled successfully.`);
      await fetchTransfers();
      if (selectedTransfer && selectedTransfer.transferId === transferId) {
        const updated = await stockTransferApi.getTransferById(transferId);
        setSelectedTransfer(updated.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || `Failed to cancel transfer #${transferId}`);
    } finally {
      setCancellingId(null);
    }
  };

  const filteredTransfers = transfers.filter((t) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (t.transferNumber && t.transferNumber.toLowerCase().includes(q)) ||
      (t.fromWarehouseName && t.fromWarehouseName.toLowerCase().includes(q)) ||
      (t.toWarehouseName && t.toWarehouseName.toLowerCase().includes(q)) ||
      (t.createdByUserName && t.createdByUserName.toLowerCase().includes(q));
    return matchesSearch;
  });

  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'COMPLETED') {
      return {
        bg: 'rgba(16, 185, 129, 0.12)',
        color: 'var(--accent-green)',
        label: 'COMPLETED',
        icon: CheckCircle2,
      };
    }
    if (s === 'IN_TRANSIT') {
      return {
        bg: 'rgba(0, 210, 255, 0.12)',
        color: 'var(--accent-cyan)',
        label: 'IN TRANSIT',
        icon: ArrowRightLeft,
      };
    }
    if (s === 'DRAFT') {
      return {
        bg: 'rgba(59, 130, 246, 0.12)',
        color: '#60a5fa',
        label: 'DRAFT',
        icon: Clock,
      };
    }
    if (s === 'PENDING') {
      return {
        bg: 'rgba(245, 158, 11, 0.12)',
        color: 'var(--accent-amber)',
        label: 'PENDING',
        icon: Clock,
      };
    }
    if (s === 'CANCELLED') {
      return {
        bg: 'rgba(239, 68, 68, 0.12)',
        color: 'var(--accent-coral)',
        label: 'CANCELLED',
        icon: AlertCircle,
      };
    }
    return {
      bg: 'rgba(255, 255, 255, 0.08)',
      color: 'var(--text-secondary)',
      label: s || 'UNKNOWN',
      icon: Clock,
    };
  };

  const draftCount = transfers.filter((t) => (t.status || '').toUpperCase() === 'DRAFT').length;
  const inTransitCount = transfers.filter((t) => (t.status || '').toUpperCase() === 'IN_TRANSIT').length;
  const completedCount = transfers.filter((t) => (t.status || '').toUpperCase() === 'COMPLETED').length;

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Inter-Warehouse Stock Transfers
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Physical inventory movements, bin-to-bin transfers & double-entry ledger audits (Live Backend Service)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={fetchTransfers} className="btn btn-secondary btn-sm" title="Refresh Transfers">
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary btn-sm">
            <Plus size={13} /> New Stock Transfer
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--accent-green)',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
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
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid-kpi-4">
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Total Transfer Orders</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
            {transfers.length}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Registered Movement Manifests</span>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Draft / Staging</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#60a5fa', marginTop: '4px' }}>
            {draftCount}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Created Movement Orders</span>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>In Transit</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-cyan)', marginTop: '4px' }}>
            {inTransitCount}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Under Physical Movement</span>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Completed Transfers</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-green)', marginTop: '4px' }}>
            {completedCount}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Settled Double-Entry Ledgers</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-card)',
        padding: '10px 14px',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['ALL', 'Draft', 'Pending', 'In_Transit', 'Completed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`btn btn-xs ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
            >
              {s === 'ALL' ? 'All Orders' : s === 'In_Transit' ? 'In Transit' : s}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <input
            type="text"
            className="input"
            placeholder="Search transfer #, warehouse, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '28px', fontSize: '11px' }}
          />
          <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '9px' }} />
        </div>
      </div>

      {/* Transfers Table */}
      <div style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        flex: 1
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
            Loading transfer orders from backend...
          </div>
        ) : filteredTransfers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <ArrowRightLeft size={28} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
            <p style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>No Stock Transfers Found</p>
            <p style={{ fontSize: '11px', marginTop: '4px' }}>
              {transfers.length === 0
                ? 'No inter-warehouse transfer orders have been initiated yet.'
                : 'No transfer orders match the active filter criteria.'}
            </p>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary btn-xs" style={{ marginTop: '12px' }}>
              <Plus size={12} /> Create First Stock Transfer
            </button>
          </div>
        ) : (
          <table className="table" style={{ width: '100%', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={{ width: '160px' }}>Transfer Number</th>
                <th>Scheduled Date</th>
                <th>Source Facility</th>
                <th>Destination Facility</th>
                <th>Items Count</th>
                <th>Status</th>
                <th>Created By</th>
                <th style={{ textAlign: 'right', width: '180px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransfers.map((t) => {
                const badge = getStatusBadge(t.status);
                const BadgeIcon = badge.icon;
                const canComplete = t.status && (
                  t.status.toUpperCase() === 'DRAFT' ||
                  t.status.toUpperCase() === 'PENDING' ||
                  t.status.toUpperCase() === 'IN_TRANSIT'
                );

                return (
                  <tr key={t.transferId}>
                    <td className="font-mono" style={{ fontWeight: '700', color: 'var(--accent-cyan)' }}>
                      {t.transferNumber}
                    </td>
                    <td className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {t.transferDate || 'Immediate'}
                    </td>
                    <td>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {t.fromWarehouseName || `Warehouse #${t.fromWarehouseId}`}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {t.toWarehouseName || `Warehouse #${t.toWarehouseId}`}
                      </span>
                    </td>
                    <td className="font-mono">
                      {t.items ? t.items.length : 1} item(s)
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-xs)',
                        background: badge.bg,
                        color: badge.color,
                        fontSize: '10px',
                        fontWeight: '700',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        <BadgeIcon size={11} />
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {t.createdByUserName || 'System'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => setSelectedTransfer(t)}
                          className="btn btn-ghost btn-xs"
                          title="View Transfer Details"
                        >
                          <Eye size={12} /> Details
                        </button>
                        {canComplete && (
                          <>
                            <button
                              onClick={() => handleCompleteTransfer(t.transferId)}
                              disabled={completingId === t.transferId || cancellingId === t.transferId}
                              className="btn btn-primary btn-xs"
                              title="Complete and execute inventory transfer"
                            >
                              <Check size={12} /> {completingId === t.transferId ? 'Settling...' : 'Complete'}
                            </button>
                            <button
                              onClick={() => handleCancelTransfer(t.transferId)}
                              disabled={completingId === t.transferId || cancellingId === t.transferId}
                              className="btn btn-ghost btn-xs"
                              style={{ color: 'var(--accent-coral)' }}
                              title="Cancel stock transfer"
                            >
                              <X size={12} /> {cancellingId === t.transferId ? 'Cancelling...' : 'Cancel'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Transfer Details Modal */}
      {selectedTransfer && (
        <div className="modal-backdrop" onClick={() => setSelectedTransfer(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowRightLeft size={18} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Transfer Manifest: <span className="font-mono">{selectedTransfer.transferNumber}</span>
                </h3>
              </div>
              <button onClick={() => setSelectedTransfer(null)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--bg-surface)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Source Facility</span>
                <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {selectedTransfer.fromWarehouseName} (WH #{selectedTransfer.fromWarehouseId})
                </p>
              </div>

              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Destination Facility</span>
                <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {selectedTransfer.toWarehouseName} (WH #{selectedTransfer.toWarehouseId})
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <Calendar size={13} />
                <span>Date: <strong>{selectedTransfer.transferDate || 'N/A'}</strong></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <User size={13} />
                <span>Initiated By: <strong>{selectedTransfer.createdByUserName || 'Operator'}</strong></span>
              </div>
            </div>

            <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
              Transfer Items & Location Bins
            </h4>

            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xs)', overflow: 'hidden', marginBottom: '16px' }}>
              <table className="table" style={{ width: '100%', fontSize: '11.5px' }}>
                <thead>
                  <tr>
                    <th>Batch #</th>
                    <th>Source Bin</th>
                    <th>Destination Bin</th>
                    <th style={{ textAlign: 'right' }}>Transfer Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTransfer.items && selectedTransfer.items.length > 0 ? (
                    selectedTransfer.items.map((item, idx) => (
                      <tr key={item.stiId || idx}>
                        <td className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}>
                          {item.materialBatchNo || item.finishedBatchNo || `Batch #${item.materialBatchId || item.finishedBatchId || '1'}`}
                        </td>
                        <td className="font-mono">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Layers size={11} color="var(--text-muted)" />
                            {item.fromBinCode || `Bin #${item.fromBinId}`}
                          </span>
                        </td>
                        <td className="font-mono">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Layers size={11} color="var(--accent-cyan)" />
                            {item.toBinCode || `Bin #${item.toBinId}`}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '700' }} className="font-mono">
                          {item.quantity} {item.uomCode || 'KG'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        No line items recorded for this transfer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setSelectedTransfer(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
              {(selectedTransfer.status?.toUpperCase() === 'DRAFT' ||
                selectedTransfer.status?.toUpperCase() === 'PENDING' ||
                selectedTransfer.status?.toUpperCase() === 'IN_TRANSIT') && (
                <>
                  <button
                    onClick={() => handleCancelTransfer(selectedTransfer.transferId)}
                    disabled={completingId === selectedTransfer.transferId || cancellingId === selectedTransfer.transferId}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--accent-coral)' }}
                  >
                    <X size={13} /> {cancellingId === selectedTransfer.transferId ? 'Cancelling...' : 'Cancel Transfer'}
                  </button>
                  <button
                    onClick={() => handleCompleteTransfer(selectedTransfer.transferId)}
                    disabled={completingId === selectedTransfer.transferId || cancellingId === selectedTransfer.transferId}
                    className="btn btn-primary btn-sm"
                  >
                    <Check size={13} /> {completingId === selectedTransfer.transferId ? 'Completing...' : 'Complete Transfer'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Transfer Modal */}
      <CreateStockTransferModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTransferCreated={() => {
          setActionSuccess('Stock transfer initiated successfully.');
          fetchTransfers();
        }}
      />
    </div>
  );
}

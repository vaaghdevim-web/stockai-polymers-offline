import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, RefreshCw, CheckCircle2, AlertCircle, Sparkles, Search, Check, Eye, X, ShieldCheck, FileCheck, Plus, Building2, Package } from 'lucide-react';
import { procurementApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatPlantName } from '../utils/brand';
import CreatePurchaseOrderModal from '../components/CreatePurchaseOrderModal';

export default function Procurement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('recommendations'); // 'recommendations' | 'orders'
  const [recommendations, setRecommendations] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [approvingPoId, setApprovingPoId] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [scanSummary, setScanSummary] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'New' | 'Approved' | 'Converted'
  const [priorityFilter, setPriorityFilter] = useState('ALL'); // 'ALL' | 'Critical' | 'High' | 'Medium' | 'Low'
  const [search, setSearch] = useState('');
  const [selectedRec, setSelectedRec] = useState(null);
  const [selectedPo, setSelectedPo] = useState(null);

  // Modal State
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [convertingRec, setConvertingRec] = useState(null);

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await procurementApi.getRecommendations();
      setRecommendations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load procurement recommendations.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPurchaseOrders = useCallback(async () => {
    try {
      setOrdersLoading(true);
      setError(null);
      const res = await procurementApi.getPurchaseOrders();
      setPurchaseOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load purchase orders.');
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
    fetchPurchaseOrders();
  }, [fetchRecommendations, fetchPurchaseOrders]);

  const handleTriggerReorderCheck = async () => {
    try {
      setReorderLoading(true);
      setError(null);
      setSuccessMsg(null);
      const res = await procurementApi.triggerReorderCheck();
      const summary = res.data;
      setScanSummary(summary);
      setSuccessMsg(`Reorder scan completed: ${summary.totalMaterialsEvaluated} materials evaluated, ${summary.criticalStockCount} critical low-stock items detected.`);
      await fetchRecommendations();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to execute automated reorder scan.');
    } finally {
      setReorderLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      setApprovingId(id);
      setError(null);
      setSuccessMsg(null);
      await procurementApi.approveRecommendation(id);
      setSuccessMsg(`Purchase recommendation #${id} approved successfully. Ready to convert to vendor PO.`);
      await fetchRecommendations();
      if (selectedRec && selectedRec.recommendationId === id) {
        setSelectedRec(prev => ({ ...prev, status: 'Approved', approvedByUserName: user?.name || 'Authorized Lead' }));
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Access Denied: Approving purchase recommendations requires Supervisor, Manager, or Admin authority.');
      } else {
        setError(err.response?.data?.message || err.message || `Failed to approve recommendation #${id}`);
      }
    } finally {
      setApprovingId(null);
    }
  };

  const handleApprovePo = async (poId) => {
    try {
      setApprovingPoId(poId);
      setError(null);
      setSuccessMsg(null);
      await procurementApi.approvePurchaseOrder(poId);
      setSuccessMsg(`Purchase Order #${poId} approved successfully.`);
      await fetchPurchaseOrders();
      if (selectedPo && selectedPo.poId === poId) {
        setSelectedPo(prev => ({ ...prev, status: 'Approved' }));
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || `Failed to approve purchase order #${poId}`);
    } finally {
      setApprovingPoId(null);
    }
  };

  const [cancellingPoId, setCancellingPoId] = useState(null);

  const handleCancelPo = async (poId) => {
    if (!window.confirm(`Are you sure you want to cancel Purchase Order #${poId}?`)) return;
    try {
      setCancellingPoId(poId);
      setError(null);
      setSuccessMsg(null);
      await procurementApi.cancelPurchaseOrder(poId);
      setSuccessMsg(`Purchase Order #${poId} cancelled successfully.`);
      await fetchPurchaseOrders();
      if (selectedPo && selectedPo.poId === poId) {
        setSelectedPo(prev => ({ ...prev, status: 'Cancelled' }));
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || `Failed to cancel purchase order #${poId}`);
    } finally {
      setCancellingPoId(null);
    }
  };

  const handleOpenConvertToPo = (rec) => {
    setConvertingRec(rec);
    setIsPoModalOpen(true);
  };

  const handleOpenCreatePo = () => {
    setConvertingRec(null);
    setIsPoModalOpen(true);
  };

  const handlePoCreated = () => {
    setSuccessMsg('Purchase Order generated successfully.');
    fetchPurchaseOrders();
    fetchRecommendations();
    setActiveTab('orders');
  };

  // Combined Filtering: Status + Priority + Search
  const filtered = recommendations.filter((rec) => {
    if (statusFilter !== 'ALL') {
      const recStatus = (rec.status || '').toUpperCase();
      const targetStatus = statusFilter.toUpperCase();
      if (recStatus !== targetStatus) return false;
    }

    if (priorityFilter !== 'ALL') {
      const recPriority = (rec.priority || '').toUpperCase();
      const targetPriority = priorityFilter.toUpperCase();
      if (recPriority !== targetPriority) return false;
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        (rec.materialName && rec.materialName.toLowerCase().includes(q)) ||
        (rec.materialCode && rec.materialCode.toLowerCase().includes(q)) ||
        (rec.reason && rec.reason.toLowerCase().includes(q)) ||
        (rec.plantName && rec.plantName.toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }

    return true;
  });

  const filteredOrders = purchaseOrders.filter((po) => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        (po.poNumber && po.poNumber.toLowerCase().includes(q)) ||
        (po.supplierName && po.supplierName.toLowerCase().includes(q)) ||
        (po.plantName && po.plantName.toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }
    return true;
  });

  // Global KPI totals
  const criticalCount = recommendations.filter(r => (r.priority || '').toUpperCase() === 'CRITICAL').length;
  const newCount = recommendations.filter(r => (r.status || '').toUpperCase() === 'NEW' || (r.status || '').toUpperCase() === 'PENDING').length;
  const approvedCount = recommendations.filter(r => (r.status || '').toUpperCase() === 'APPROVED').length;

  const getPriorityBadge = (priority) => {
    const p = (priority || '').toUpperCase();
    if (p === 'CRITICAL') {
      return { bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-coral)', border: 'rgba(239, 68, 68, 0.3)' };
    }
    if (p === 'HIGH') {
      return { bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', border: 'rgba(245, 158, 11, 0.3)' };
    }
    return { bg: 'rgba(0, 210, 255, 0.12)', color: 'var(--accent-cyan)', border: 'rgba(0, 210, 255, 0.3)' };
  };

  return (
    <div style={{ padding: '20px', paddingBottom: '40px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 className="font-heading" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
              Procurement & Automated Reorder Engine
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: 'var(--radius-xs)',
              background: 'rgba(0, 210, 255, 0.12)',
              border: '1px solid rgba(0, 210, 255, 0.3)',
              color: 'var(--accent-cyan)',
              fontSize: '11px',
              fontWeight: '600'
            }}>
              <Sparkles size={12} /> ALERTS & PO ENGINE
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Real-time material replenishment recommendations based on active batch consumption rates, safety stock, and vendor purchase orders.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => { fetchRecommendations(); fetchPurchaseOrders(); }}
            className="btn btn-secondary btn-sm"
            disabled={loading || ordersLoading}
            title="Reload data"
          >
            <RefreshCw size={13} className={loading || ordersLoading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button 
            onClick={handleTriggerReorderCheck}
            className="btn btn-secondary btn-sm"
            disabled={reorderLoading}
          >
            <ShoppingCart size={13} /> {reorderLoading ? 'Scanning...' : 'Trigger Reorder Scan'}
          </button>
          <button 
            onClick={handleOpenCreatePo}
            className="btn btn-primary btn-sm"
          >
            <Plus size={13} /> Create Formal PO
          </button>
        </div>
      </div>

      {/* Reorder Scan Summary Banner */}
      {scanSummary && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(0, 210, 255, 0.08)',
          border: '1px solid rgba(0, 210, 255, 0.25)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--accent-cyan)' }}>
              Automated Reorder Scan Results
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Evaluated {scanSummary.totalMaterialsEvaluated} raw materials · Found {scanSummary.lowStockCount} low-stock & {scanSummary.criticalStockCount} critical items · Created {scanSummary.newRecommendationsCreated} purchase recommendations.
            </div>
          </div>
          <button onClick={() => setScanSummary(null)} className="btn btn-ghost btn-xs" style={{ padding: '4px' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {successMsg && (
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
          <span>{successMsg}</span>
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

      {/* KPI Summary Cards */}
      <div className="grid-kpi-4">
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Total Purchase Demands</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
            {recommendations.length}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Material Replenishments</span>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Critical Urgency</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-coral)', marginTop: '4px' }}>
            {criticalCount}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--accent-coral)' }}>Immediate Action Required</span>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Awaiting Approval</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-amber)', marginTop: '4px' }}>
            {newCount}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Pending Purchase Manager</span>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Purchase Orders (PO)</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-green)', marginTop: '4px' }}>
            {purchaseOrders.length}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Issued Vendor Orders</span>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`btn btn-sm ${activeTab === 'recommendations' ? 'btn-primary' : 'btn-ghost'}`}
        >
          <ShoppingCart size={13} /> Purchase Recommendations ({recommendations.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`btn btn-sm ${activeTab === 'orders' ? 'btn-primary' : 'btn-ghost'}`}
        >
          <FileCheck size={13} /> Formal Purchase Orders ({purchaseOrders.length})
        </button>
      </div>

      {/* Tab 1: Recommendations */}
      {activeTab === 'recommendations' && (
        <>
          {/* Filters Toolbar */}
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
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {['ALL', 'New', 'Approved', 'Converted'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`btn btn-xs ${statusFilter === status ? 'btn-primary' : 'btn-ghost'}`}
                  >
                    {status === 'ALL' ? 'All Statuses' : status}
                  </button>
                ))}
              </div>

              <div style={{ width: '1px', background: 'var(--border-subtle)', margin: '0 4px' }} />

              <div style={{ display: 'flex', gap: '4px' }}>
                {['ALL', 'Critical', 'High', 'Medium'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriorityFilter(p)}
                    className={`btn btn-xs ${priorityFilter === p ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '11px' }}
                  >
                    {p === 'ALL' ? 'All Priorities' : p}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ position: 'relative', width: '280px' }}>
              <input
                type="text"
                className="input"
                placeholder="Search material, plant, reason..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '28px', fontSize: '11px' }}
              />
              <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '9px' }} />
            </div>
          </div>

          {/* Recommendations Table */}
          <div 
            className="card" 
            style={{ 
              padding: 0, 
              overflowX: 'auto', 
              overflowY: 'visible',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              flexShrink: 0
            }}
          >
            <table className="table" style={{ width: '100%', minWidth: '960px', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)' }}>REC #</th>
                  <th style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)' }}>MATERIAL CODE / NAME</th>
                  <th style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)' }}>PLANT LOCATION</th>
                  <th style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)' }}>REORDER QTY</th>
                  <th style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)' }}>EST. COST</th>
                  <th style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)' }}>PRIORITY</th>
                  <th style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)' }}>STATUS</th>
                  <th style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                      Loading smart purchase recommendations from backend...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      <CheckCircle2 size={24} color="var(--accent-green)" style={{ marginBottom: '8px', display: 'inline-block' }} />
                      <div style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>
                        {priorityFilter !== 'ALL' || statusFilter !== 'ALL' || search.trim() 
                          ? 'No Matching Recommendations' 
                          : 'All Raw Material Stock Levels Are Healthy'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((rec) => {
                    const priorityBadge = getPriorityBadge(rec.priority);
                    const isApproved = (rec.status || '').toUpperCase() === 'APPROVED';
                    const isConverted = (rec.status || '').toUpperCase() === 'CONVERTED';

                    return (
                      <tr key={rec.recommendationId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          #{rec.recommendationId}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                            {rec.materialName}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                            {rec.materialCode}
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                          {formatPlantName(rec.plantName)}
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {Number(rec.recommendedQty || 0).toLocaleString()} kg
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                          ₹{Number(rec.estimatedCost || 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-xs)',
                            fontSize: '10px',
                            fontWeight: '700',
                            fontFamily: 'var(--font-mono)',
                            background: priorityBadge.bg,
                            color: priorityBadge.color,
                            border: '1px solid',
                            borderColor: priorityBadge.border
                          }}>
                            {rec.priority || 'MEDIUM'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: '700',
                            color: isConverted ? 'var(--accent-cyan)' : (isApproved ? 'var(--accent-green)' : 'var(--accent-amber)')
                          }}>
                            {rec.status || 'New'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              onClick={() => setSelectedRec(rec)}
                              className="btn btn-ghost btn-xs"
                              title="View Reorder Analysis Details"
                            >
                              <Eye size={12} /> Details
                            </button>
                            {!isApproved && !isConverted && (
                              <button
                                onClick={() => handleApprove(rec.recommendationId)}
                                disabled={approvingId === rec.recommendationId}
                                className="btn btn-secondary btn-xs"
                                title="Approve Purchase Recommendation"
                              >
                                <Check size={12} /> {approvingId === rec.recommendationId ? 'Approving...' : 'Approve'}
                              </button>
                            )}
                            {isApproved && !isConverted && (
                              <button
                                onClick={() => handleOpenConvertToPo(rec)}
                                className="btn btn-primary btn-xs"
                                title="Convert Approved Recommendation into Vendor Purchase Order"
                              >
                                <FileCheck size={12} /> Create PO
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Tab 2: Formal Purchase Orders */}
      {activeTab === 'orders' && (
        <div 
          className="card" 
          style={{ 
            padding: 0, 
            overflowX: 'auto', 
            overflowY: 'visible',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            flexShrink: 0
          }}
        >
          <table className="table" style={{ width: '100%', minWidth: '960px', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                <th style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)' }}>PO NUMBER</th>
                <th style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)' }}>VENDOR / SUPPLIER</th>
                <th style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)' }}>PLANT FACILITY</th>
                <th style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)' }}>PO DATE</th>
                <th style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)' }}>ITEMS</th>
                <th style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)' }}>TOTAL VALUE</th>
                <th style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)' }}>STATUS</th>
                <th style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {ordersLoading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                    Loading purchase orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <FileCheck size={24} color="var(--accent-cyan)" style={{ marginBottom: '8px', display: 'inline-block' }} />
                    <div style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>No Purchase Orders Found</div>
                    <div style={{ fontSize: '11px', marginTop: '4px' }}>
                      Convert an approved purchase recommendation or click "Create Formal PO" above.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((po) => {
                  const isDraft = (po.status || '').toUpperCase() === 'DRAFT';
                  const isApproved = (po.status || '').toUpperCase() === 'APPROVED';

                  return (
                    <tr key={po.poId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                        {po.poNumber}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{po.supplierName}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{po.supplierCode}</div>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                        {formatPlantName(po.plantName)}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {po.poDate}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-primary)' }}>
                          {po.items?.length || 0} material line(s)
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {po.items?.map(it => `${it.materialCode} (${it.quantity} kg)`).join(', ')}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--accent-green)' }}>
                        ₹{Number(po.totalAmount || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-xs)',
                          fontSize: '10px',
                          fontWeight: '700',
                          fontFamily: 'var(--font-mono)',
                          background: isApproved ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          color: isApproved ? 'var(--accent-green)' : 'var(--accent-amber)',
                          border: `1px solid ${isApproved ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                        }}>
                          {po.status || 'Draft'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => setSelectedPo(po)}
                            className="btn btn-ghost btn-xs"
                          >
                            <Eye size={12} /> View
                          </button>
                          {isDraft && (
                            <button
                              onClick={() => handleApprovePo(po.poId)}
                              disabled={approvingPoId === po.poId}
                              className="btn btn-primary btn-xs"
                            >
                              <Check size={12} /> {approvingPoId === po.poId ? 'Approving...' : 'Approve PO'}
                            </button>
                          )}
                          {(po.status || '').toUpperCase() !== 'CANCELLED' && (po.status || '').toUpperCase() !== 'RECEIVED' && (po.status || '').toUpperCase() !== 'COMPLETED' && (
                            <button
                              onClick={() => handleCancelPo(po.poId)}
                              disabled={cancellingPoId === po.poId}
                              className="btn btn-secondary btn-xs"
                              style={{ color: '#EF4444' }}
                              title="Cancel Purchase Order"
                            >
                              <X size={12} /> {cancellingPoId === po.poId ? 'Cancelling...' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Recommendation Details Modal */}
      {selectedRec && (
        <div className="modal-backdrop" onClick={() => setSelectedRec(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingCart size={18} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Purchase Recommendation #{selectedRec.recommendationId}
                </h3>
              </div>
              <button onClick={() => setSelectedRec(null)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                    {selectedRec.materialName}
                  </h4>
                  <span className="font-mono" style={{ fontSize: '11px', color: 'var(--accent-cyan)' }}>
                    SKU Code: {selectedRec.materialCode}
                  </span>
                </div>
                <span className="badge badge-amber">{selectedRec.status}</span>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                <strong>Reorder Trigger Reason:</strong> {selectedRec.reason || 'Inventory has reached safety stock replenishment threshold.'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Current Stock on Hand: </span>
                  <strong className="font-mono">{Number(selectedRec.currentStock || 0).toLocaleString()} kg</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Safety Stock Threshold: </span>
                  <strong className="font-mono">{Number(selectedRec.safetyStock || 0).toLocaleString()} kg</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Recommended Order Qty: </span>
                  <strong className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{Number(selectedRec.recommendedQty || 0).toLocaleString()} kg</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Estimated Procurement Cost: </span>
                  <strong className="font-mono" style={{ color: 'var(--accent-green)' }}>₹{Number(selectedRec.estimatedCost || 0).toLocaleString()}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Supplier Lead Time: </span>
                  <strong>{selectedRec.leadTimeDays || 5} days</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Target Plant Facility: </span>
                  <strong>{formatPlantName(selectedRec.plantName)}</strong>
                </div>
              </div>

              {selectedRec.approvedByUserName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--accent-green)', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
                  <ShieldCheck size={14} />
                  <span>Approved by <strong>{selectedRec.approvedByUserName}</strong></span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setSelectedRec(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
              {(selectedRec.status || '').toUpperCase() === 'APPROVED' ? (
                <button
                  onClick={() => {
                    setSelectedRec(null);
                    handleOpenConvertToPo(selectedRec);
                  }}
                  className="btn btn-primary btn-sm"
                >
                  <FileCheck size={13} /> Convert to Purchase Order
                </button>
              ) : (
                <button
                  onClick={() => handleApprove(selectedRec.recommendationId)}
                  disabled={approvingId === selectedRec.recommendationId}
                  className="btn btn-primary btn-sm"
                >
                  <Check size={13} /> {approvingId === selectedRec.recommendationId ? 'Approving...' : 'Approve Demand'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PO View Modal */}
      {selectedPo && (
        <div className="modal-backdrop" onClick={() => setSelectedPo(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCheck size={18} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Purchase Order: {selectedPo.poNumber}
                </h3>
              </div>
              <button onClick={() => setSelectedPo(null)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Vendor: </span>
                  <strong>{selectedPo.supplierName}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Plant: </span>
                  <strong>{formatPlantName(selectedPo.plantName)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Issue Date: </span>
                  <strong className="font-mono">{selectedPo.poDate}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Status: </span>
                  <strong style={{ color: selectedPo.status === 'Approved' ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                    {selectedPo.status}
                  </strong>
                </div>
              </div>

              <div style={{ marginTop: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Ordered Line Items
                </span>
                <table className="table" style={{ width: '100%', fontSize: '11px', marginTop: '6px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-card)' }}>
                      <th style={{ padding: '6px' }}>Material</th>
                      <th style={{ padding: '6px' }}>Qty (kg)</th>
                      <th style={{ padding: '6px' }}>Rate (₹/kg)</th>
                      <th style={{ padding: '6px', textAlign: 'right' }}>Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPo.items?.map((it, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '6px' }}>{it.materialName} ({it.materialCode})</td>
                        <td style={{ padding: '6px' }} className="font-mono">{Number(it.quantity).toLocaleString()}</td>
                        <td style={{ padding: '6px' }} className="font-mono">₹{Number(it.rate).toLocaleString()}</td>
                        <td style={{ padding: '6px', textAlign: 'right' }} className="font-mono font-bold">₹{Number(it.itemTotal).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>
                  Grand Total: ₹{Number(selectedPo.totalAmount || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setSelectedPo(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
              {selectedPo.status === 'Draft' && (
                <button
                  onClick={() => handleApprovePo(selectedPo.poId)}
                  disabled={approvingPoId === selectedPo.poId}
                  className="btn btn-primary btn-sm"
                >
                  <Check size={13} /> {approvingPoId === selectedPo.poId ? 'Approving...' : 'Approve Purchase Order'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create / Convert PO Modal */}
      <CreatePurchaseOrderModal
        isOpen={isPoModalOpen}
        onClose={() => { setIsPoModalOpen(false); setConvertingRec(null); }}
        onSuccess={handlePoCreated}
        initialRecommendation={convertingRec}
      />
    </div>
  );
}

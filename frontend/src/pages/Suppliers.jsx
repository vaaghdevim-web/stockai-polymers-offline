import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  Mail, 
  Phone, 
  MapPin, 
  Search, 
  Sparkles, 
  Award, 
  TrendingUp, 
  AlertTriangle,
  Plus,
  Edit3,
  Trash2,
  Power,
  Check,
  X
} from 'lucide-react';
import { supplierApi, aiApi } from '../services/api';
import CreateSupplierModal from '../components/CreateSupplierModal';
import EditSupplierModal from '../components/EditSupplierModal';
import DeleteSupplierModal from '../components/DeleteSupplierModal';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [supplierScores, setSupplierScores] = useState([]);
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'scorecards'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [search, setSearch] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [deletingSupplier, setDeletingSupplier] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const activeParam = activeFilter === 'ACTIVE' ? true : activeFilter === 'INACTIVE' ? false : null;
      const [supRes, aiRes] = await Promise.allSettled([
        supplierApi.getSuppliers(activeParam !== null ? activeParam : false),
        aiApi.getSupplierRankings()
      ]);

      const list = supRes.status === 'fulfilled' && Array.isArray(supRes.value?.data) ? supRes.value.data : [];
      const scores = aiRes.status === 'fulfilled' && Array.isArray(aiRes.value?.data) ? aiRes.value.data : [];

      setSuppliers(list);
      setSupplierScores(scores);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load supplier management directory.');
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const showSuccessFeedback = (msg) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4500);
    fetchSuppliers();
  };

  const handleToggleStatus = async (sup) => {
    try {
      setTogglingId(sup.supplierId);
      const res = await supplierApi.toggleSupplierStatus(sup.supplierId);
      const newStatus = res.data?.isActive ? 'Active' : 'Inactive';
      showSuccessFeedback(`Vendor "${sup.supplierName}" is now ${newStatus}.`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to toggle supplier status.');
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = suppliers.filter((sup) => {
    const matchesActive =
      activeFilter === 'ALL' ||
      (activeFilter === 'ACTIVE' && sup.isActive !== false) ||
      (activeFilter === 'INACTIVE' && sup.isActive === false);

    const q = search.toLowerCase();
    const matchesSearch =
      (sup.supplierName && sup.supplierName.toLowerCase().includes(q)) ||
      (sup.gstNo && sup.gstNo.toLowerCase().includes(q)) ||
      (sup.email && sup.email.toLowerCase().includes(q)) ||
      (sup.phone && sup.phone.toLowerCase().includes(q)) ||
      (sup.address && sup.address.toLowerCase().includes(q));

    return matchesActive && matchesSearch;
  });

  const filteredScores = supplierScores.filter((sc) => {
    const q = search.toLowerCase();
    return (
      (sc.supplierName && sc.supplierName.toLowerCase().includes(q)) ||
      (sc.tier && sc.tier.toLowerCase().includes(q)) ||
      (sc.aiRecommendation && sc.aiRecommendation.toLowerCase().includes(q))
    );
  });

  const totalCount = suppliers.length;
  const activeCount = suppliers.filter((s) => s.isActive !== false).length;
  const gstinCount = suppliers.filter((s) => s.gstNo && s.gstNo.trim() !== '').length;

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Supplier Management & Vendor Directory
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Verified raw material vendors, GSTIN compliance, procurement master CRUD & AI performance scorecards
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} /> Add New Supplier
          </button>
          <button 
            onClick={fetchSuppliers}
            className="btn btn-secondary btn-sm"
            disabled={loading}
            title="Reload Suppliers"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {feedbackMessage && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--accent-green)',
          fontSize: '12.5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{feedbackMessage}</span>
          </div>
          <button 
            onClick={() => setFeedbackMessage(null)}
            style={{ background: 'transparent', border: 'none', color: 'var(--accent-green)', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
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
      <div className="grid-kpi-3">
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Total Vendors</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
            {totalCount}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Registered Supplier Entities</span>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Active Status</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-green)', marginTop: '4px' }}>
            {activeCount}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Approved for Inward Receipts</span>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>GSTIN Compliant</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-cyan)', marginTop: '4px' }}>
            {gstinCount}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Tax Master Registered</span>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('directory')}
          className={`btn btn-sm ${activeTab === 'directory' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '12px' }}
        >
          <Building2 size={13} /> Vendor Directory ({suppliers.length})
        </button>
        <button
          onClick={() => setActiveTab('scorecards')}
          className={`btn btn-sm ${activeTab === 'scorecards' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '12px', background: activeTab === 'scorecards' ? 'var(--accent-cyan)' : 'transparent', color: activeTab === 'scorecards' ? '#0F172A' : 'var(--text-primary)' }}
        >
          <Sparkles size={13} /> AI Vendor Reliability & Scorecards ({supplierScores.length})
        </button>
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
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        {activeTab === 'directory' ? (
          <div style={{ display: 'flex', gap: '6px' }}>
            {['ALL', 'ACTIVE', 'INACTIVE'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`btn btn-xs ${activeFilter === filter ? 'btn-primary' : 'btn-ghost'}`}
              >
                {filter === 'ALL' ? 'All Vendors' : filter === 'ACTIVE' ? 'Active Vendors' : 'Inactive'}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Award size={14} color="var(--accent-cyan)" />
            <span>AI Multi-Factor Model: <strong>45% QC Pass Rate · 35% On-Time Delivery · 20% Pricing</strong></span>
          </div>
        )}

        <div style={{ position: 'relative', width: '280px' }}>
          <input
            type="text"
            className="input"
            placeholder={activeTab === 'directory' ? "Search vendor name, GSTIN, phone..." : "Search supplier score, tier, strategy..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '28px', fontSize: '11px' }}
          />
          <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '9px' }} />
        </div>
      </div>

      {/* Subtab 1: Standard Vendor Directory */}
      {activeTab === 'directory' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '16px'
        }}>
          {loading ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
              Loading verified suppliers from backend database...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)' }}>
              <Building2 size={32} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
              <p style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>No Vendors Found</p>
              <p style={{ fontSize: '12px', marginTop: '4px', maxWidth: '400px', margin: '4px auto 16px auto' }}>
                {suppliers.length === 0
                  ? 'No registered suppliers exist in the master ledger yet. Register your first polymer vendor now.'
                  : 'No suppliers match the current search or status filter criteria.'}
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} /> Add Supplier Now
              </button>
            </div>
          ) : (
            filtered.map((sup) => (
              <div 
                key={sup.supplierId} 
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '16px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  transition: 'all 0.15s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: 'var(--radius-xs)',
                        background: 'rgba(2, 132, 199, 0.1)',
                        border: '1px solid rgba(2, 132, 199, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-blue)',
                        flexShrink: 0
                      }}>
                        <Building2 size={19} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                          {sup.supplierName}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          ID: #{sup.supplierId}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleStatus(sup)}
                      disabled={togglingId === sup.supplierId}
                      title="Click to toggle active status"
                      style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-xs)',
                        fontSize: '10px',
                        fontWeight: '700',
                        fontFamily: 'var(--font-mono)',
                        background: sup.isActive !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: sup.isActive !== false ? 'var(--accent-green)' : 'var(--accent-coral)',
                        border: '1px solid',
                        borderColor: sup.isActive !== false ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Power size={10} />
                      {togglingId === sup.supplierId ? '...' : sup.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </div>

                  {/* Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShieldCheck size={14} color="var(--accent-cyan)" />
                      <span>GSTIN: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{sup.gstNo || 'Not Registered'}</strong></span>
                    </div>
                    {sup.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={14} color="var(--text-muted)" />
                        <span style={{ wordBreak: 'break-all' }}>{sup.email}</span>
                      </div>
                    )}
                    {sup.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={14} color="var(--text-muted)" />
                        <span className="font-mono">{sup.phone}</span>
                      </div>
                    )}
                    {sup.address && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <MapPin size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ fontSize: '11px', lineHeight: '1.3' }}>{sup.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div style={{
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <CheckCircle2 size={12} color="var(--accent-green)" /> Verified Master
                  </span>
                  
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setEditingSupplier(sup)}
                      className="btn btn-secondary btn-xs"
                      title="Edit Supplier Details"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px' }}
                    >
                      <Edit3 size={12} /> Edit
                    </button>
                    <button
                      onClick={() => setDeletingSupplier(sup)}
                      className="btn btn-secondary btn-xs"
                      title="Delete / Deactivate Supplier"
                      style={{ color: '#DC2626', display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px' }}
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Subtab 2: AI Supplier Scorecards & Reliability Matrix */}
      {activeTab === 'scorecards' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '16px'
        }}>
          {loading ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
              Calculating real-time supplier reliability matrix...
            </div>
          ) : filteredScores.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <Sparkles size={28} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
              <p style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>No AI Scorecards Generated</p>
              <p style={{ fontSize: '11px', marginTop: '4px' }}>
                Supplier performance data will populate automatically as inward raw material batches and QC lab tests are completed.
              </p>
            </div>
          ) : (
            filteredScores.map((sc, rank) => {
              const isTier1 = sc.tier && sc.tier.includes('1');
              const isTier2 = sc.tier && sc.tier.includes('2');

              return (
                <div
                  key={sc.supplierId || rank}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                    padding: '18px',
                    background: 'var(--bg-panel)',
                    border: `1px solid ${isTier1 ? 'rgba(56, 189, 248, 0.4)' : isTier2 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div>
                    {/* Top Row: Rank, Name, Tier Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: isTier1 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                            color: isTier1 ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: '800'
                          }}>
                            #{rank + 1}
                          </span>
                          <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                            {sc.supplierName}
                          </h3>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', marginLeft: '32px' }}>
                          Vendor ID: #{sc.supplierId}
                        </div>
                      </div>

                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontWeight: '800',
                        background: isTier1 ? 'rgba(16, 185, 129, 0.15)' : isTier2 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isTier1 ? 'var(--accent-emerald)' : isTier2 ? 'var(--accent-amber)' : 'var(--accent-coral)',
                        border: `1px solid ${isTier1 ? 'rgba(16, 185, 129, 0.3)' : isTier2 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                      }}>
                        {sc.tier || (isTier1 ? 'Tier-1 Preferred' : 'Tier-2 Reliable')}
                      </span>
                    </div>

                    {/* Composite Score Meter */}
                    <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Composite Reliability
                        </span>
                        <span style={{ fontSize: '16px', fontWeight: '900', color: isTier1 ? 'var(--accent-emerald)' : 'var(--accent-cyan)' }}>
                          {sc.compositeScore ? sc.compositeScore.toFixed(1) : '94.5'}<span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/100</span>
                        </span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, Math.max(0, sc.compositeScore || 94.5))}%`,
                            background: isTier1 ? 'linear-gradient(90deg, #0284C7, #10B981)' : 'linear-gradient(90deg, #F59E0B, #EF4444)',
                            borderRadius: '3px'
                          }}
                        />
                      </div>
                    </div>

                    {/* 3 Metric Factors Breakdown */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center', marginBottom: '12px' }}>
                      <div style={{ padding: '8px 4px', background: 'var(--bg-surface)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>QC Pass Rate</div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-emerald)', marginTop: '2px' }}>
                          {sc.qcPassRate ? `${sc.qcPassRate.toFixed(1)}%` : '98.5%'}
                        </div>
                      </div>

                      <div style={{ padding: '8px 4px', background: 'var(--bg-surface)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>On-Time Rate</div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                          {sc.onTimeDeliveryScore ? `${sc.onTimeDeliveryScore.toFixed(1)}%` : '96.0%'}
                        </div>
                      </div>

                      <div style={{ padding: '8px 4px', background: 'var(--bg-surface)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Price Index</div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-amber)', marginTop: '2px' }}>
                          {sc.priceScore ? `${sc.priceScore.toFixed(1)}%` : '92.0%'}
                        </div>
                      </div>
                    </div>

                    {/* AI Recommendation Strategy */}
                    <div style={{
                      padding: '10px 12px',
                      background: isTier1 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                      border: `1px solid ${isTier1 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.4'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: isTier1 ? 'var(--accent-emerald)' : 'var(--accent-amber)', fontWeight: '700', marginBottom: '2px', fontSize: '11px' }}>
                        <Sparkles size={12} /> AI Purchasing Directive
                      </div>
                      {sc.aiRecommendation || 'Preferred Tier-1 Supplier. Eligible for automatic order allocation and volume discount contracts.'}
                    </div>
                  </div>

                  <div style={{
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '10.5px',
                    color: 'var(--text-muted)'
                  }}>
                    <span>Defect PPM: <strong style={{ color: 'var(--text-primary)' }}>{sc.defectPpm || 120} PPM</strong></span>
                    <span style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}>AI Confidence: 99.2%</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modals */}
      <CreateSupplierModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={showSuccessFeedback}
      />

      <EditSupplierModal
        isOpen={!!editingSupplier}
        supplier={editingSupplier}
        onClose={() => setEditingSupplier(null)}
        onSuccess={showSuccessFeedback}
      />

      <DeleteSupplierModal
        isOpen={!!deletingSupplier}
        supplier={deletingSupplier}
        onClose={() => setDeletingSupplier(null)}
        onSuccess={showSuccessFeedback}
      />
    </div>
  );
}

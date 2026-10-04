import React, { useState, useEffect, useCallback } from 'react';
import { Building2, RefreshCw, AlertCircle, CheckCircle2, ShieldCheck, Mail, Phone, MapPin, Search } from 'lucide-react';
import { supplierApi } from '../services/api';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [search, setSearch] = useState('');

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // If filtering for Active only, pass activeOnly: true. If ALL or Inactive, load all to filter in client
      const activeParam = activeFilter === 'ACTIVE' ? true : false;
      const res = await supplierApi.getSuppliers(activeParam);
      const list = Array.isArray(res.data) ? res.data : [];
      setSuppliers(list);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load supplier management directory.');
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

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

  const totalCount = suppliers.length;
  const activeCount = suppliers.filter((s) => s.isActive !== false).length;
  const gstinCount = suppliers.filter((s) => s.gstNo && s.gstNo.trim() !== '').length;

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Supplier Management & Vendor Directory
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Verified raw material vendors, GSTIN compliance, contact details & procurement accounts (Live Backend Registry)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
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

        <div style={{ position: 'relative', width: '280px' }}>
          <input
            type="text"
            className="input"
            placeholder="Search vendor name, GSTIN, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '28px', fontSize: '11px' }}
          />
          <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '9px' }} />
        </div>
      </div>

      {/* Supplier Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '16px'
      }}>
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
            Loading verified suppliers from backend database...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <Building2 size={28} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
            <p style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>No Vendors Found</p>
            <p style={{ fontSize: '11px', marginTop: '4px' }}>
              {suppliers.length === 0
                ? 'No registered suppliers exist in the backend master ledger.'
                : 'No suppliers match the current search or filter criteria.'}
            </p>
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
                borderRadius: 'var(--radius-md)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-xs)',
                      background: 'rgba(0, 210, 255, 0.1)',
                      border: '1px solid rgba(0, 210, 255, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-cyan)'
                    }}>
                      <Building2 size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                        {sup.supplierName}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        ID: #{sup.supplierId}
                      </div>
                    </div>
                  </div>

                  <span style={{
                    padding: '2px 7px',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '10px',
                    fontWeight: '700',
                    fontFamily: 'var(--font-mono)',
                    background: sup.isActive !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: sup.isActive !== false ? 'var(--accent-green)' : 'var(--accent-coral)',
                    border: '1px solid',
                    borderColor: sup.isActive !== false ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                  }}>
                    {sup.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} color="var(--accent-cyan)" />
                    <span>GSTIN: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{sup.gstNo || 'Not Registered'}</strong></span>
                  </div>
                  {sup.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={14} color="var(--text-muted)" />
                      <span>{sup.email}</span>
                    </div>
                  )}
                  {sup.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={14} color="var(--text-muted)" />
                      <span className="font-mono">{sup.phone}</span>
                    </div>
                  )}
                  {sup.address && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} color="var(--text-muted)" />
                      <span style={{ fontSize: '11px' }}>{sup.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{
                paddingTop: '10px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                color: 'var(--text-muted)'
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} color="var(--accent-green)" /> Verified Master
                </span>
                <span className="font-mono">Authoritative main</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

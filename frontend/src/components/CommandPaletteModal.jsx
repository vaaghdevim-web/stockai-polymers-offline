import React, { useState, useEffect } from 'react';
import { Search, X, Boxes, Cpu, FlaskConical, ArrowRight } from 'lucide-react';
import { inventoryApi, productionApi, qualityApi } from '../services/api';

export default function CommandPaletteModal({ isOpen, onClose, onNavigate }) {
  const [query, setQuery] = useState('');
  const [rawMaterials, setRawMaterials] = useState([]);
  const [productionRuns, setProductionRuns] = useState([]);
  const [inspections, setInspections] = useState([]);

  useEffect(() => {
    if (isOpen) {
      Promise.allSettled([
        inventoryApi.getRawMaterials(),
        productionApi.getRuns(),
        qualityApi.getInspections(),
      ]).then(([rawRes, runsRes, qcRes]) => {
        if (rawRes.status === 'fulfilled') setRawMaterials(rawRes.value.data || []);
        if (runsRes.status === 'fulfilled') setProductionRuns(runsRes.value.data || []);
        if (qcRes.status === 'fulfilled') setInspections(qcRes.value.data || []);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredRaw = rawMaterials.filter(item =>
    (item.materialName && item.materialName.toLowerCase().includes(query.toLowerCase())) ||
    (item.materialCode && item.materialCode.toLowerCase().includes(query.toLowerCase()))
  );

  const filteredRuns = productionRuns.filter(item =>
    (item.productionNumber && item.productionNumber.toLowerCase().includes(query.toLowerCase())) ||
    (item.productName && item.productName.toLowerCase().includes(query.toLowerCase()))
  );

  const filteredQC = inspections.filter(item =>
    (item.materialBatchNo && item.materialBatchNo.toLowerCase().includes(query.toLowerCase())) ||
    (item.finishedBatchNo && item.finishedBatchNo.toLowerCase().includes(query.toLowerCase())) ||
    (item.productionRunNumber && item.productionRunNumber.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', maxHeight: '520px', display: 'flex', flexDirection: 'column' }}
      >
        {/* Search Input Bar */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Search size={18} color="var(--accent-cyan)" />
          <input
            type="text"
            autoFocus
            placeholder="Type a lot number, resin SKU, work order or inspection ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '14px',
              width: '100%',
              fontFamily: 'var(--font-sans)'
            }}
          />
          <button 
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Quick Navigation Items */}
        <div style={{ padding: '8px 14px 0 14px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'dashboard', label: 'Control Room' },
              { id: 'raw-materials', label: 'Raw Materials' },
              { id: 'procurement', label: 'Procurement' },
              { id: 'production', label: 'Production' },
              { id: 'quality', label: 'Quality Control' },
              { id: 'logistics', label: 'Logistics' },
              { id: 'suppliers', label: 'Suppliers & Accounts' },
              { id: 'admin', label: 'Admin Settings' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { onNavigate(tab.id); onClose(); }}
                style={{
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Stream */}
        <div style={{ padding: '10px 14px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Raw Materials Section */}
          {filteredRaw.length > 0 && (
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
                Raw Material Inventory ({filteredRaw.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {filteredRaw.slice(0, 5).map(item => (
                  <div
                    key={item.materialId}
                    onClick={() => { onNavigate('raw-materials'); onClose(); }}
                    style={{
                      padding: '8px 10px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Boxes size={14} color="var(--accent-cyan)" />
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: '500' }}>{item.materialName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          SKU: {item.materialCode} · Category: {item.categoryName || 'Resin'}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="font-mono" style={{ fontSize: '12px', fontWeight: '600' }}>
                        {Number(item.currentStock || 0).toLocaleString()} kg
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Production Runs */}
          {filteredRuns.length > 0 && (
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
                Production Work Orders ({filteredRuns.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {filteredRuns.slice(0, 5).map(item => (
                  <div
                    key={item.productionId}
                    onClick={() => { onNavigate('production'); onClose(); }}
                    style={{
                      padding: '8px 10px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Cpu size={14} color="var(--accent-amber)" />
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: '500' }}>
                          {item.productionNumber} — {item.productName || 'Compound'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          Status: {item.status} · Planned: {Number(item.plannedQty || 0).toLocaleString()} kg
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={14} color="var(--text-muted)" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QC Inspections */}
          {filteredQC.length > 0 && (
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
                Quality Lab Tests ({filteredQC.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {filteredQC.slice(0, 5).map(item => (
                  <div
                    key={item.inspectionId}
                    onClick={() => { onNavigate('quality'); onClose(); }}
                    style={{
                      padding: '8px 10px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FlaskConical size={14} color="var(--accent-purple)" />
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: '500' }}>
                          Inspection #{item.inspectionId} ({item.inspectionType || 'Final'})
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          Batch: {item.materialBatchNo || item.finishedBatchNo || item.productionRunNumber || 'BATCH'}
                        </div>
                      </div>
                    </div>
                    <span className={`badge ${item.status === 'PASSED' ? 'badge-emerald' : 'badge-coral'}`}>
                      {item.status || 'PASSED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredRaw.length === 0 && filteredRuns.length === 0 && filteredQC.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px', fontSize: '12px' }}>
              No matching live database entities found for query.
            </div>
          )}
        </div>

        <div style={{
          padding: '8px 16px',
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border-default)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>Press <kbd style={{ padding: '0 4px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '2px' }}>ESC</kbd> to close</span>
          <span style={{ color: 'var(--accent-cyan)' }}>SVP Live Database Lookup Engine</span>
        </div>
      </div>
    </div>
  );
}

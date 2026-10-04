import React, { useState, useEffect, useCallback } from 'react';
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  RefreshCw,
  Building2,
  ArrowRightLeft,
  Layers,
  ShoppingCart,
  CheckCircle2,
  X,
  Clock,
  Info,
  Loader2,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import {
  getRawMaterials,
  getFifoBatches,
  getAvailableStock,
  triggerReorderCheck,
  extractErrorMessage
} from '../services/domain/rawMaterialsService';
import InwardBatchModal from '../components/InwardBatchModal';
import WarehouseManagement from './WarehouseManagement';
import StockTransfers from './StockTransfers';

export default function RawMaterials() {
  const [subTab, setSubTab] = useState('silos'); // 'silos' | 'warehouses' | 'transfers'
  const [materials, setMaterials] = useState([]);
  const [availableStockMap, setAvailableStockMap] = useState({});
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showInwardModal, setShowInwardModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // FIFO Batches Modal State
  const [selectedFifoMaterial, setSelectedFifoMaterial] = useState(null);
  const [fifoBatches, setFifoBatches] = useState([]);
  const [fifoLoading, setFifoLoading] = useState(false);
  const [fifoError, setFifoError] = useState(null);

  // Reorder Evaluation Modal State
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [targetReorderMaterial, setTargetReorderMaterial] = useState(null);
  const [isReordering, setIsReordering] = useState(false);
  const [reorderResult, setReorderResult] = useState(null);
  const [reorderError, setReorderError] = useState(null);

  const fetchMaterials = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getRawMaterials();
      const rawList = Array.isArray(res.data) ? res.data : [];
      setMaterials(rawList);

      // Concurrently query usable available stock for all raw materials
      const stockResults = await Promise.allSettled(
        rawList.map(async (m) => {
          try {
            const stockRes = await getAvailableStock(m.materialId);
            return { id: m.materialId, stock: stockRes.data };
          } catch {
            return { id: m.materialId, stock: m.currentStock ?? 0 };
          }
        })
      );

      const stockMap = {};
      stockResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          stockMap[result.value.id] = result.value.stock;
        }
      });
      setAvailableStockMap(stockMap);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to fetch raw material inventory from backend.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === 'silos') {
      fetchMaterials();
    }
  }, [subTab, fetchMaterials]);

  // FIFO Batches modal loader
  const handleOpenFifo = async (material) => {
    setSelectedFifoMaterial(material);
    setFifoLoading(true);
    setFifoError(null);
    setFifoBatches([]);
    try {
      const res = await getFifoBatches(material.materialId);
      // Strictly preserve backend order (ORDER BY b.receivedAt ASC, b.batchId ASC)
      setFifoBatches(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setFifoError(extractErrorMessage(err, 'Failed to load FIFO batches for this material.'));
    } finally {
      setFifoLoading(false);
    }
  };

  const handleCloseFifo = () => {
    setSelectedFifoMaterial(null);
    setFifoBatches([]);
    setFifoError(null);
  };

  // Reorder Modal Handlers
  const handleOpenReorder = (material = null) => {
    setTargetReorderMaterial(material);
    setReorderResult(null);
    setReorderError(null);
    setShowReorderModal(true);
  };

  const handleExecuteReorder = async () => {
    try {
      setIsReordering(true);
      setReorderError(null);
      const res = await triggerReorderCheck();
      setReorderResult(res.data);
      // Refresh inventory totals after procurement evaluation
      fetchMaterials();
    } catch (err) {
      setReorderError(extractErrorMessage(err, 'Automated reorder evaluation failed.'));
    } finally {
      setIsReordering(false);
    }
  };

  const handleCloseReorder = () => {
    setShowReorderModal(false);
    setTargetReorderMaterial(null);
    setReorderResult(null);
    setReorderError(null);
  };

  const filtered = materials.filter((m) => {
    const cat = m.categoryName || m.category || '';
    const matchesCat = filterCategory === 'ALL' || cat.toLowerCase().includes(filterCategory.toLowerCase());
    const query = search.toLowerCase();
    const matchesSearch =
      (m.materialName && m.materialName.toLowerCase().includes(query)) ||
      (m.materialCode && m.materialCode.toLowerCase().includes(query)) ||
      (cat && cat.toLowerCase().includes(query));
    return matchesCat && matchesSearch;
  });

  const categories = ['ALL', 'Polymer', 'Additive', 'Filler', 'Resin'];

  return (
    <div
      style={{
        padding: subTab === 'silos' ? '20px' : '20px 20px 0 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        overflowY: subTab === 'silos' ? 'auto' : 'hidden',
        height: '100%'
      }}
    >
      {/* Top Module Navigation Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '1px solid var(--border-default)',
          paddingBottom: '12px'
        }}
      >
        <button
          onClick={() => setSubTab('silos')}
          className={`btn btn-sm ${subTab === 'silos' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '12px' }}
        >
          <Boxes size={14} /> Raw Material Silos
        </button>
        <button
          onClick={() => setSubTab('warehouses')}
          className={`btn btn-sm ${subTab === 'warehouses' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '12px' }}
        >
          <Building2 size={14} /> Warehouses & Storage Bins
        </button>
        <button
          onClick={() => setSubTab('transfers')}
          className={`btn btn-sm ${subTab === 'transfers' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '12px' }}
        >
          <ArrowRightLeft size={14} /> Stock Transfers
        </button>
      </div>

      {/* Sub-tab Views */}
      {subTab === 'warehouses' && (
        <div style={{ margin: '0 -20px 0 -20px', flex: 1, minHeight: 0, height: '100%' }}>
          <WarehouseManagement />
        </div>
      )}

      {subTab === 'transfers' && (
        <div style={{ margin: '0 -20px 0 -20px', flex: 1, minHeight: 0, height: '100%' }}>
          <StockTransfers />
        </div>
      )}

      {subTab === 'silos' && (
        <>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 className="font-heading" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                Raw Material Silos & Chemical Storage
              </h1>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Polymer resins, virgin pellets, masterbatches & additives inventory (Double-Entry Ledger & FIFO Synchronized)
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={fetchMaterials}
                disabled={loading}
                className="btn btn-secondary btn-sm"
                title="Refresh Inventory"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
              <button
                onClick={() => handleOpenReorder(null)}
                className="btn btn-secondary btn-sm"
                title="Trigger Automated Procurement Reorder Evaluation"
              >
                <Sparkles size={13} color="var(--accent-cyan)" /> Reorder Check
              </button>
              <button
                onClick={() => setShowInwardModal(true)}
                className="btn btn-primary btn-sm"
              >
                <Plus size={13} /> Log Inward Batch
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--accent-coral)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Filter Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-card)',
              padding: '10px 14px',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              gap: '12px'
            }}
          >
            {/* Category Tabs */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className="btn btn-sm"
                  style={{
                    background: filterCategory === cat ? 'var(--bg-surface-active)' : 'transparent',
                    color: filterCategory === cat ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    border: '1px solid',
                    borderColor: filterCategory === cat ? 'var(--border-strong)' : 'transparent',
                    fontSize: '11.5px'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={{ width: '260px', position: 'relative' }}>
              <input
                type="text"
                className="input"
                placeholder="Filter by grade, SKU, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '28px', fontSize: '12px' }}
              />
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '8px' }} />
            </div>
          </div>

          {/* Raw Materials Grid Table */}
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU Code</th>
                  <th>Material Description</th>
                  <th>Category</th>
                  <th>Available Stock</th>
                  <th>Total Ledger Stock</th>
                  <th>Reorder Level</th>
                  <th>Safety Stock</th>
                  <th>Standard Cost</th>
                  <th>Status & Action</th>
                  <th style={{ textAlign: 'center' }}>FIFO Batches</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const currentStock = Number(item.currentStock || 0);
                  const availableStock = availableStockMap[item.materialId] !== undefined
                    ? Number(availableStockMap[item.materialId])
                    : currentStock;
                  const safetyStock = Number(item.safetyStock || 0);
                  const reorderLevel = Number(item.reorderLevel || 0);
                  const isLow = availableStock <= reorderLevel || availableStock <= safetyStock;
                  const uom = item.defaultUomCode || 'kg';

                  return (
                    <tr key={item.materialId}>
                      <td>
                        <div className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}>
                          {item.materialCode}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{item.materialName}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {item.categoryName || item.category || 'Polymer Grade'}
                        </span>
                      </td>
                      <td>
                        <div
                          className="font-mono"
                          style={{
                            fontSize: '13px',
                            fontWeight: '700',
                            color: isLow ? 'var(--accent-coral)' : 'var(--accent-emerald)'
                          }}
                        >
                          {availableStock.toLocaleString()} {uom}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Usable</div>
                      </td>
                      <td>
                        <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                          {currentStock.toLocaleString()} {uom}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Total In-Store</div>
                      </td>
                      <td className="font-mono" style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        {reorderLevel.toLocaleString()} {uom}
                      </td>
                      <td className="font-mono" style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        {safetyStock.toLocaleString()} {uom}
                      </td>
                      <td className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        ₹{Number(item.standardCost || 0).toFixed(2)}/{uom}
                      </td>
                      <td>
                        {isLow ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="badge badge-coral">REORDER</span>
                            <button
                              onClick={() => handleOpenReorder(item)}
                              className="btn btn-sm"
                              style={{
                                padding: '3px 8px',
                                fontSize: '11px',
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: 'var(--accent-coral)',
                                border: '1px solid rgba(239, 68, 68, 0.3)'
                              }}
                              title={`Trigger reorder evaluation for ${item.materialName}`}
                            >
                              <ShoppingCart size={11} /> Reorder
                            </button>
                          </div>
                        ) : (
                          <span className="badge badge-emerald">AVAILABLE</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleOpenFifo(item)}
                          className="btn btn-ghost btn-sm"
                          style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            border: '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-sm)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Layers size={13} color="var(--accent-cyan)" /> Batches
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                      No raw materials matching search criteria.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                        <Loader2 size={16} className="animate-spin" /> Loading raw material inventory & ledger balances...
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Inward Batch Modal */}
          <InwardBatchModal
            isOpen={showInwardModal}
            onClose={() => setShowInwardModal(false)}
            onBatchAdded={fetchMaterials}
            rawMaterials={materials}
          />

          {/* FIFO Material Batches Modal */}
          {selectedFifoMaterial && (
            <div className="modal-backdrop" onClick={handleCloseFifo}>
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '680px', padding: '22px' }}
              >
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <Layers size={18} color="var(--accent-cyan)" />
                      <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        FIFO Material Batches
                      </h3>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <span className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}>
                        {selectedFifoMaterial.materialCode}
                      </span>
                      {' — '}
                      <span>{selectedFifoMaterial.materialName}</span>
                    </div>
                  </div>
                  <button onClick={handleCloseFifo} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                    <X size={16} />
                  </button>
                </div>

                {/* Info Note on FIFO Ledger Rule */}
                <div
                  style={{
                    padding: '8px 12px',
                    background: 'var(--bg-surface-active)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '14px'
                  }}
                >
                  <ShieldCheck size={14} color="var(--accent-emerald)" />
                  <span>
                    Strict First-In, First-Out ledger allocation (<code className="font-mono">receivedAt ASC, batchId ASC</code>).
                    Production orders allocate from the top batch first.
                  </span>
                </div>

                {fifoError && (
                  <div
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--accent-coral)',
                      fontSize: '12px',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <AlertTriangle size={15} />
                    <span>{fifoError}</span>
                  </div>
                )}

                {/* Batch Table */}
                <div className="data-table-container" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>#</th>
                        <th>Batch Number</th>
                        <th>Lot Number</th>
                        <th>Available Quantity</th>
                        <th>Received Date & Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fifoLoading ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                              <Loader2 size={16} className="animate-spin" /> Querying FIFO batch queue...
                            </div>
                          </td>
                        </tr>
                      ) : fifoBatches.length > 0 ? (
                        fifoBatches.map((batch, idx) => (
                          <tr key={batch.batchId || idx}>
                            <td>
                              <span
                                style={{
                                  fontSize: '10.5px',
                                  fontWeight: '700',
                                  padding: '2px 6px',
                                  borderRadius: 'var(--radius-sm)',
                                  background: idx === 0 ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-surface-active)',
                                  color: idx === 0 ? 'var(--accent-emerald)' : 'var(--text-secondary)'
                                }}
                              >
                                #{idx + 1}
                              </span>
                            </td>
                            <td>
                              <div className="font-mono" style={{ fontWeight: '600', color: 'var(--accent-cyan)' }}>
                                {batch.batchNo}
                              </div>
                            </td>
                            <td>
                              <div className="font-mono" style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                                {batch.lotNumber || '—'}
                              </div>
                            </td>
                            <td>
                              <div className="font-mono" style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                                {Number(batch.availableWeightKg || 0).toLocaleString()} {selectedFifoMaterial.defaultUomCode || 'kg'}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={11} />
                                {batch.receivedAt ? new Date(batch.receivedAt).toLocaleString() : '—'}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)' }}>
                            No active batches currently allocated in inventory. Inward receipts or transfers will appear here.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Modal Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Total Batches: <strong style={{ color: 'var(--text-primary)' }}>{fifoBatches.length}</strong>
                  </div>
                  <button onClick={handleCloseFifo} className="btn btn-secondary btn-sm">
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reorder Confirmation & Result Modal */}
          {showReorderModal && (
            <div className="modal-backdrop" onClick={handleCloseReorder}>
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '540px', padding: '22px' }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShoppingCart size={18} color="var(--accent-coral)" />
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      Automated Procurement Reorder Evaluation
                    </h3>
                  </div>
                  <button onClick={handleCloseReorder} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                    <X size={16} />
                  </button>
                </div>

                {reorderError && (
                  <div
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--accent-coral)',
                      fontSize: '12px',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <AlertTriangle size={15} />
                    <span>{reorderError}</span>
                  </div>
                )}

                {reorderResult ? (
                  <div>
                    {/* Success Summary */}
                    <div
                      style={{
                        padding: '12px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                    >
                      <CheckCircle2 size={18} color="var(--accent-emerald)" />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-emerald)' }}>
                          Reorder Evaluation Completed
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Scan executed at {reorderResult.scanTimestamp ? new Date(reorderResult.scanTimestamp).toLocaleTimeString() : 'Just now'}
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '10px',
                        marginBottom: '16px'
                      }}
                    >
                      <div
                        style={{
                          background: 'var(--bg-surface-active)',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Materials Evaluated
                        </div>
                        <div className="font-mono" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                          {reorderResult.totalMaterialsEvaluated ?? 0}
                        </div>
                      </div>

                      <div
                        style={{
                          background: 'var(--bg-surface-active)',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Low Stock Detected
                        </div>
                        <div className="font-mono" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-coral)' }}>
                          {reorderResult.lowStockCount ?? 0}
                        </div>
                      </div>

                      <div
                        style={{
                          background: 'var(--bg-surface-active)',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Critical Stock
                        </div>
                        <div className="font-mono" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-coral)' }}>
                          {reorderResult.criticalStockCount ?? 0}
                        </div>
                      </div>

                      <div
                        style={{
                          background: 'var(--bg-surface-active)',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          New Recommendations
                        </div>
                        <div className="font-mono" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-cyan)' }}>
                          {reorderResult.newRecommendationsCreated ?? 0}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
                      <button onClick={handleCloseReorder} className="btn btn-primary btn-sm">
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
                      {targetReorderMaterial ? (
                        <>
                          You are triggering automated reorder analysis for{' '}
                          <strong style={{ color: 'var(--text-primary)' }}>
                            {targetReorderMaterial.materialName} ({targetReorderMaterial.materialCode})
                          </strong>
                          . The engine will evaluate reorder levels, safety stock thresholds, and ongoing purchase orders across inventory.
                        </>
                      ) : (
                        'Trigger a system-wide evaluation of raw materials against their safety stock and reorder thresholds. The engine will automatically generate purchase recommendations for deficient SKUs.'
                      )}
                    </div>

                    <div
                      style={{
                        padding: '10px 12px',
                        background: 'var(--bg-surface-active)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11.5px',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '16px'
                      }}
                    >
                      <Info size={15} color="var(--accent-cyan)" />
                      <span>
                        Calls backend <code className="font-mono">POST /api/v1/procurement/reorder-check</code> to synchronously evaluate stock deficits.
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button onClick={handleCloseReorder} className="btn btn-secondary btn-sm" disabled={isReordering}>
                        Cancel
                      </button>
                      <button
                        onClick={handleExecuteReorder}
                        disabled={isReordering}
                        className="btn btn-primary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        {isReordering ? (
                          <>
                            <Loader2 size={13} className="animate-spin" /> Evaluating...
                          </>
                        ) : (
                          <>
                            <Sparkles size={13} /> Run Reorder Check
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

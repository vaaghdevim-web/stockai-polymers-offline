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
  X,
  Clock,
  Info,
  Loader2,
  Sparkles,
  Filter,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  GitBranch,
  Printer,
  Trash2
} from 'lucide-react';
import { inventoryApi } from '../services/api';
import {
  getRawMaterials,
  getFifoBatches,
  getAvailableStock,
  triggerReorderCheck,
  extractErrorMessage
} from '../services/domain/rawMaterialsService';
import InwardBatchModal from '../components/InwardBatchModal';
import CreateRawMaterialModal from '../components/CreateRawMaterialModal';
import BatchGenealogyModal from '../components/BatchGenealogyModal';
import GrnSlipModal from '../components/GrnSlipModal';
import WarehouseManagement from './WarehouseManagement';
import StockTransfers from './StockTransfers';

export default function RawMaterials({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'LOW' | 'EXPIRING'
  const [subModule, setSubModule] = useState('silos'); // 'silos' | 'warehouses' | 'transfers'
  const [materials, setMaterials] = useState([]);
  const [availableStockMap, setAvailableStockMap] = useState({});
  const [selectedGrnBatch, setSelectedGrnBatch] = useState(null);
  const [showGrnModal, setShowGrnModal] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSilo, setSelectedSilo] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [showInwardModal, setShowInwardModal] = useState(false);
  const [showDefineMaterialModal, setShowDefineMaterialModal] = useState(false);
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

  // Action Menu Dropdown State
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [materialToDelete, setMaterialToDelete] = useState(null);
  const [deletingMaterial, setDeletingMaterial] = useState(false);

  // Batch Traceability & Genealogy Modal State
  const [showTraceModal, setShowTraceModal] = useState(false);
  const [traceBatchId, setTraceBatchId] = useState('');

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
    if (subModule === 'silos') {
      fetchMaterials();
    }
  }, [subModule, fetchMaterials]);

  // FIFO Batches modal loader
  const handleOpenFifo = async (material) => {
    setSelectedFifoMaterial(material);
    setFifoLoading(true);
    setFifoError(null);
    setFifoBatches([]);
    setActionMenuOpenId(null);
    try {
      const res = await getFifoBatches(material.materialId);
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
    setActionMenuOpenId(null);
  };

  const handleExecuteReorder = async () => {
    try {
      setIsReordering(true);
      setReorderError(null);
      const res = await triggerReorderCheck();
      setReorderResult(res.data);
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

  // Calculate status for each material
  const getMaterialStatus = (item) => {
    const current = Number(item.currentStock || 0);
    const available = availableStockMap[item.materialId] !== undefined
      ? Number(availableStockMap[item.materialId])
      : current;
    const reorder = Number(item.reorderLevel || 0);
    const safety = Number(item.safetyStock || 0);

    if (available <= 0) return 'Out of Stock';
    if (available <= reorder || available <= safety) return 'Low';
    if (item.expiryDays && item.expiryDays < 30) return 'Expiring Soon';
    return 'In Stock';
  };

  // Filtered List
  const filtered = materials.filter((m) => {
    const cat = (m.categoryName || m.category || 'PP').toUpperCase();
    const status = getMaterialStatus(m);
    const query = search.toLowerCase();

    // Tab Filter
    if (activeTab === 'LOW' && status !== 'Low' && status !== 'Out of Stock') return false;
    if (activeTab === 'EXPIRING' && status !== 'Expiring Soon') return false;

    // Dropdown Category Filter
    if (selectedCategory !== 'ALL' && !cat.includes(selectedCategory.toUpperCase())) return false;

    // Dropdown Status Filter
    if (selectedStatus !== 'ALL' && status !== selectedStatus) return false;

    // Text Search
    const matchesSearch =
      (m.materialName && m.materialName.toLowerCase().includes(query)) ||
      (m.materialCode && m.materialCode.toLowerCase().includes(query)) ||
      (cat && cat.toLowerCase().includes(query)) ||
      (m.location && m.location.toLowerCase().includes(query));

    return matchesSearch;
  });

  // Low Stock Items for Lower Panel
  const lowStockItems = materials.filter((m) => {
    const status = getMaterialStatus(m);
    return status === 'Low' || status === 'Out of Stock';
  });

  // Pagination calculation
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Dynamic Category Distribution calculation from active materials
  const totalStockKg = materials.reduce((acc, m) => acc + Number(m.currentStock || 0), 0);
  const totalValueCr = materials.length > 0 
    ? (materials.reduce((acc, m) => acc + (Number(m.currentStock || 0) * (Number(m.unitCost || 112.5))), 0) / 10000000).toFixed(2)
    : '4.86';

  const categoryColors = ['#0284C7', '#06B6D4', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899'];
  const categoryGroups = {};
  materials.forEach(m => {
    const cat = m.categoryName || m.category || 'Polymer';
    categoryGroups[cat] = (categoryGroups[cat] || 0) + Number(m.currentStock || 0);
  });

  const categorySummary = Object.keys(categoryGroups).length > 0
    ? Object.keys(categoryGroups).map((cat, idx) => ({
        label: cat,
        value: totalStockKg > 0 ? Math.round((categoryGroups[cat] / totalStockKg) * 100) : 20,
        color: categoryColors[idx % categoryColors.length]
      }))
    : [
        { label: 'PP', value: 45, color: '#0284C7' },
        { label: 'Masterbatch', value: 25, color: '#06B6D4' },
        { label: 'Additives', value: 15, color: '#F59E0B' },
        { label: 'Filler', value: 10, color: '#10B981' },
        { label: 'Ink', value: 5, color: '#8B5CF6' }
      ];

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Sub-Module Switcher (Raw Materials | Warehouses | Transfers) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setSubModule('silos')}
            className={`btn btn-sm ${subModule === 'silos' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Boxes size={14} /> Raw Materials & Silos
          </button>
          <button
            onClick={() => setSubModule('warehouses')}
            className={`btn btn-sm ${subModule === 'warehouses' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Building2 size={14} /> Warehouses & Storage Bins
          </button>
          <button
            onClick={() => setSubModule('transfers')}
            className={`btn btn-sm ${subModule === 'transfers' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <ArrowRightLeft size={14} /> Stock Transfers
          </button>
        </div>

        {subModule === 'silos' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={fetchMaterials}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              title="Refresh Silo Balances"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={() => {
                setTraceBatchId('');
                setShowTraceModal(true);
              }}
              className="btn btn-secondary btn-sm"
              title="Open Universal Batch & Lot Genealogy Engine"
              style={{
                color: '#0284C7',
                borderColor: '#BAE6FD',
                background: '#F0F9FF'
              }}
            >
              <GitBranch size={13} /> Trace Batch
            </button>
            <button
              onClick={() => handleOpenReorder(null)}
              className="btn btn-secondary btn-sm"
              title="Trigger Automated Procurement Reorder"
            >
              <Sparkles size={13} color="#0284C7" /> Reorder Check
            </button>
            <button
              onClick={() => setShowDefineMaterialModal(true)}
              className="btn btn-secondary btn-sm"
              title="Define and register a new Raw Material SKU in the catalog"
              style={{
                color: '#0284C7',
                borderColor: '#BAE6FD',
                background: '#F0F9FF'
              }}
            >
              <Plus size={14} /> Define Material SKU
            </button>
            <button
              onClick={() => setShowInwardModal(true)}
              className="btn btn-primary btn-sm"
              title="Record an incoming raw material batch into inventory"
            >
              <Plus size={14} /> Batch Inward
            </button>
          </div>
        )}
      </div>

      {subModule === 'warehouses' && <WarehouseManagement onNavigate={onNavigate} />}
      {subModule === 'transfers' && <StockTransfers onNavigate={onNavigate} />}

      {subModule === 'silos' && (
        <>
          {/* Page Header */}
          <div>
            <h1 className="font-heading" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Raw Materials & Silos
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              View and manage raw materials inventory across silos.
            </p>
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

          {/* Main Table Container Card */}
          <div className="panel-card" style={{ padding: '0', overflow: 'hidden' }}>
            {/* Tabs Header */}
            <div className="tab-list" style={{ padding: '0 16px' }}>
              <button
                onClick={() => { setActiveTab('ALL'); setCurrentPage(1); }}
                className={`tab-button ${activeTab === 'ALL' ? 'active' : ''}`}
              >
                All Materials
              </button>
              <button
                onClick={() => { setActiveTab('LOW'); setCurrentPage(1); }}
                className={`tab-button ${activeTab === 'LOW' ? 'active' : ''}`}
              >
                Low Stock
              </button>
              <button
                onClick={() => { setActiveTab('EXPIRING'); setCurrentPage(1); }}
                className={`tab-button ${activeTab === 'EXPIRING' ? 'active' : ''}`}
              >
                Expired Soon
              </button>
            </div>

            {/* Filter Bar */}
            <div style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              borderBottom: '1px solid var(--border-default)',
              background: '#FFFFFF',
              flexWrap: 'wrap'
            }}>
              {/* Search Bar */}
              <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '360px' }}>
                <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '9px' }} />
                <input
                  type="text"
                  className="input"
                  placeholder="Search material name, code, supplier..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  style={{ paddingLeft: '32px', fontSize: '13px' }}
                />
              </div>

              {/* Filter Dropdowns */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <select
                  className="select"
                  value={selectedCategory}
                  onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                  style={{ width: '150px', fontSize: '12.5px' }}
                >
                  <option value="ALL">All Categories</option>
                  {(Array.from(new Set(materials.map(m => m.categoryName || m.category).filter(Boolean))).length > 0
                    ? Array.from(new Set(materials.map(m => m.categoryName || m.category).filter(Boolean)))
                    : ['PP', 'Masterbatch', 'Additive', 'Filler', 'Polymer']
                  ).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <select
                  className="select"
                  value={selectedSilo}
                  onChange={(e) => { setSelectedSilo(e.target.value); setCurrentPage(1); }}
                  style={{ width: '130px', fontSize: '12.5px' }}
                >
                  <option value="ALL">All Silos</option>
                  {(Array.from(new Set(materials.map(m => m.location).filter(Boolean))).length > 0
                    ? Array.from(new Set(materials.map(m => m.location).filter(Boolean)))
                    : ['Silo 1', 'Silo 2', 'Silo 3', 'Bay A']
                  ).map(silo => (
                    <option key={silo} value={silo}>{silo}</option>
                  ))}
                </select>

                <select
                  className="select"
                  value={selectedStatus}
                  onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                  style={{ width: '130px', fontSize: '12.5px' }}
                >
                  <option value="ALL">All Status</option>
                  <option value="In Stock">In Stock</option>
                  <option value="Low">Low</option>
                  <option value="Expiring Soon">Expiring Soon</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>

                <button
                  onClick={() => {
                    setSearch('');
                    setSelectedCategory('ALL');
                    setSelectedSilo('ALL');
                    setSelectedStatus('ALL');
                  }}
                  className="btn btn-secondary btn-sm"
                  title="Reset Filter Criteria"
                >
                  <Filter size={13} /> Filters
                </button>
              </div>
            </div>

            {/* Enterprise Material Table */}
            <div className="data-table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Material Name</th>
                    <th>Category</th>
                    <th>Silo / Location</th>
                    <th style={{ textAlign: 'right' }}>Current Stock</th>
                    <th style={{ textAlign: 'right' }}>Reorder Level</th>
                    <th>Expiry</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center', width: '90px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item, index) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                    const currentStock = Number(item.currentStock || 0);
                    const availableStock = availableStockMap[item.materialId] !== undefined
                      ? Number(availableStockMap[item.materialId])
                      : currentStock;
                    const reorderLevel = Number(item.reorderLevel || 0);
                    const status = getMaterialStatus(item);
                    const uom = item.defaultUomCode || 'kg';
                    const siloLocation = item.location || `Silo ${((index % 4) + 1)} - A`;
                    const expiryText = item.expiryDays ? `${item.expiryDays} Days` : '90 Days';

                    return (
                      <tr key={item.materialId || index}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{rowNumber}</td>
                        <td>
                          <div>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                              {item.materialName || 'Polymer Granules'}
                            </div>
                            <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {item.materialCode || `SKU-RM-00${index + 1}`}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {item.categoryName || item.category || 'PP'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0284C7' }} />
                            <span>{siloLocation}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="font-mono" style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '13px' }}>
                            {availableStock.toLocaleString()} {uom}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>
                            {reorderLevel.toLocaleString()} {uom}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{expiryText}</span>
                        </td>
                        <td>
                          {status === 'In Stock' && <span className="badge badge-emerald">In Stock</span>}
                          {status === 'Low' && <span className="badge badge-coral">Low</span>}
                          {status === 'Expiring Soon' && <span className="badge badge-amber">Expiring Soon</span>}
                          {status === 'Out of Stock' && <span className="badge badge-muted">Out of Stock</span>}
                        </td>
                        <td style={{ textAlign: 'center', position: 'relative' }}>
                          <button
                            onClick={() => setActionMenuOpenId(actionMenuOpenId === item.materialId ? null : item.materialId)}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '4px' }}
                            title="Material Options"
                          >
                            <MoreVertical size={16} color="var(--text-muted)" />
                          </button>

                          {/* 3-Dot Action Menu */}
                          {actionMenuOpenId === item.materialId && (
                            <div style={{
                              position: 'absolute',
                              top: 'calc(100% - 4px)',
                              right: '10px',
                              width: '160px',
                              background: '#FFFFFF',
                              border: '1px solid var(--border-default)',
                              borderRadius: '8px',
                              boxShadow: 'var(--shadow-md)',
                              padding: '4px',
                              zIndex: 50,
                              textAlign: 'left'
                            }}>
                              <button
                                onClick={() => handleOpenFifo(item)}
                                style={{
                                  width: '100%',
                                  padding: '7px 10px',
                                  fontSize: '12px',
                                  background: 'transparent',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  color: 'var(--text-primary)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <Layers size={13} color="#0284C7" /> View Batches
                              </button>
                              <button
                                onClick={() => handleOpenReorder(item)}
                                style={{
                                  width: '100%',
                                  padding: '7px 10px',
                                  fontSize: '12px',
                                  background: 'transparent',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  color: '#B91C1C'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#FEF2F2'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <ShoppingCart size={13} /> Reorder Stock
                              </button>
                              <button
                                onClick={() => {
                                  setActionMenuOpenId(null);
                                  setMaterialToDelete(item);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '7px 10px',
                                  fontSize: '12px',
                                  background: 'transparent',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  color: '#EF4444'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#FEF2F2'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <Trash2 size={13} /> Delete / Deactivate
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {paginatedItems.length === 0 && !loading && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                        No raw materials matching search criteria.
                      </td>
                    </tr>
                  )}

                  {loading && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                          <Loader2 size={16} className="animate-spin" /> Loading raw material inventory...
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div style={{
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid var(--border-default)',
              fontSize: '12.5px',
              color: 'var(--text-secondary)'
            }}>
              <div>
                Showing {totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–
                {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary btn-sm"
                  style={{ opacity: currentPage === 1 ? 0.5 : 1 }}
                >
                  <ChevronLeft size={14} /> Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: currentPage === page ? '#0284C7' : 'var(--border-default)',
                      background: currentPage === page ? '#0284C7' : '#FFFFFF',
                      color: currentPage === page ? '#FFFFFF' : 'var(--text-primary)',
                      fontWeight: currentPage === page ? '600' : '400',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary btn-sm"
                  style={{ opacity: currentPage === totalPages ? 0.5 : 1 }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Lower Dashboard Area (Stock by Category Donut Chart + Low-stock Items Panel) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: '20px' }}>
            {/* Left Panel: Stock by Category Donut Chart */}
            <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Stock by Category
                </h3>
                <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>5 Categories</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '20px', padding: '10px 0' }}>
                {/* SVG Donut Graphic */}
                <div style={{ position: 'relative', width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="150" height="150" viewBox="0 0 42 42">
                    <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#E2E8F0" strokeWidth="4"></circle>
                    <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#0284C7" strokeWidth="4.5" strokeDasharray="45 55" strokeDashoffset="25"></circle>
                    <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#06B6D4" strokeWidth="4.5" strokeDasharray="25 75" strokeDashoffset="80"></circle>
                    <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#F59E0B" strokeWidth="4.5" strokeDasharray="15 85" strokeDashoffset="55"></circle>
                    <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#10B981" strokeWidth="4.5" strokeDasharray="10 90" strokeDashoffset="40"></circle>
                    <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#8B5CF6" strokeWidth="4.5" strokeDasharray="5 95" strokeDashoffset="30"></circle>
                  </svg>
                  <div style={{ position: 'absolute', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      ₹ {totalValueCr} Cr
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Total Value
                    </div>
                  </div>
                </div>

                {/* Percentage Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  {categorySummary.map((cat) => (
                    <div key={cat.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: cat.color }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{cat.label}</span>
                      </div>
                      <span className="font-mono" style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {cat.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel: Low-stock Items */}
            <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Low-stock Items
                </h3>
                <button
                  onClick={() => { setActiveTab('LOW'); setCurrentPage(1); }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#0284C7',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  View All <ArrowUpRight size={13} />
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th style={{ textAlign: 'right' }}>Current Stock</th>
                      <th style={{ textAlign: 'right' }}>Reorder Level</th>
                      <th>Silo</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(lowStockItems.length > 0 ? lowStockItems.slice(0, 5) : materials.slice(0, 5)).map((item, idx) => {
                      const current = Number(item.currentStock || 0);
                      const reorder = Number(item.reorderLevel || 1000);
                      const uom = item.defaultUomCode || 'kg';

                      return (
                        <tr key={item.materialId || idx}>
                          <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                            {item.materialName || 'PP Granules (Natural)'}
                          </td>
                          <td className="font-mono" style={{ textAlign: 'right', fontWeight: '700', color: '#DC2626' }}>
                            {current.toLocaleString()} {uom}
                          </td>
                          <td className="font-mono" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                            {reorder.toLocaleString()} {uom}
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>
                            {item.location || `Silo ${idx + 1}`}
                          </td>
                          <td>
                            <span className="badge badge-coral">Low</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Inward Batch Modal */}
          <InwardBatchModal
            isOpen={showInwardModal}
            onClose={() => setShowInwardModal(false)}
            onBatchAdded={fetchMaterials}
            rawMaterials={materials}
          />

          {/* Define New Raw Material SKU Modal */}
          <CreateRawMaterialModal
            isOpen={showDefineMaterialModal}
            onClose={() => setShowDefineMaterialModal(false)}
            onMaterialCreated={fetchMaterials}
          />

          {/* FIFO Material Batches Modal */}
          {selectedFifoMaterial && (
            <div className="modal-backdrop" onClick={handleCloseFifo}>
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '680px', padding: '24px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <Layers size={18} color="#0284C7" />
                      <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        FIFO Material Batches
                      </h3>
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      <span className="font-mono" style={{ color: '#0284C7', fontWeight: '600' }}>
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

                <div style={{
                  padding: '10px 14px',
                  background: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#0369A1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <Info size={15} />
                  <span>Strict FIFO Queue: Oldest batches are prioritized for consumption during compounding.</span>
                </div>

                {fifoLoading && (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Loader2 size={20} className="animate-spin" /> Loading batches...
                  </div>
                )}

                {fifoError && (
                  <div style={{
                    padding: '10px 14px',
                    background: 'var(--accent-coral-light)',
                    border: '1px solid var(--accent-coral-border)',
                    borderRadius: '6px',
                    color: 'var(--accent-coral-text)',
                    fontSize: '12px'
                  }}>
                    {fifoError}
                  </div>
                )}

                {!fifoLoading && !fifoError && (
                  <div className="data-table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Batch No</th>
                          <th>Lot Number</th>
                          <th>Received Date</th>
                          <th style={{ textAlign: 'right' }}>Usable Qty</th>
                          <th>QC Status</th>
                          <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fifoBatches.map((b, idx) => (
                          <tr key={b.batchId || idx}>
                            <td className="font-mono" style={{ fontWeight: '600', color: '#0284C7' }}>
                              {b.batchNumber || `BAT-${idx + 101}`}
                            </td>
                            <td className="font-mono">{b.supplierLotNumber || 'LOT-2026-X'}</td>
                            <td>{b.receivedAt ? new Date(b.receivedAt).toLocaleDateString() : 'Today'}</td>
                            <td className="font-mono" style={{ textAlign: 'right', fontWeight: '700' }}>
                              {Number(b.quantityRemaining || b.initialQuantity || 0).toLocaleString()} {selectedFifoMaterial.defaultUomCode || 'kg'}
                            </td>
                            <td>
                              <span className="badge badge-emerald">{b.qcStatus || 'PASSED'}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedGrnBatch(b);
                                    setShowGrnModal(true);
                                  }}
                                  className="btn btn-secondary btn-xs"
                                  style={{
                                    fontSize: '11px',
                                    padding: '3px 7px'
                                  }}
                                  title="Print Goods Receipt Note (GRN) Inward Voucher"
                                >
                                  <Printer size={11} color="#0284C7" /> GRN Slip
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setTraceBatchId(b.batchNumber || b.supplierLotNumber);
                                    setShowTraceModal(true);
                                  }}
                                  className="btn btn-secondary btn-xs"
                                  style={{
                                    fontSize: '11px',
                                    padding: '3px 7px',
                                    color: '#0284C7',
                                    borderColor: '#BAE6FD',
                                    background: '#F0F9FF'
                                  }}
                                  title="Trace Full Batch Lineage & Compounding Genealogy"
                                >
                                  <GitBranch size={11} /> Trace
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {fifoBatches.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                              No active FIFO batches in storage.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Goods Receipt Note (GRN) Printable Modal */}
          <GrnSlipModal
            isOpen={showGrnModal}
            onClose={() => {
              setShowGrnModal(false);
              setSelectedGrnBatch(null);
            }}
            batch={selectedGrnBatch}
            material={selectedFifoMaterial}
          />

          {/* Automated Reorder Evaluation Modal */}
          {showReorderModal && (
            <div className="modal-backdrop" onClick={handleCloseReorder}>
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '540px', padding: '24px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={20} color="#0284C7" />
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      Automated Procurement Reorder Evaluation
                    </h3>
                  </div>
                  <button onClick={handleCloseReorder} className="btn btn-ghost btn-sm">
                    <X size={16} />
                  </button>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                  This triggers the procurement engine to scan all silo inventory levels, calculate daily consumption burn-rates, and generate draft purchase recommendations.
                </p>

                {reorderResult && (
                  <div style={{
                    padding: '12px 16px',
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: '8px',
                    color: '#047857',
                    fontSize: '13px',
                    marginBottom: '16px'
                  }}>
                    {reorderResult.message || 'Reorder evaluation completed successfully!'}
                  </div>
                )}

                {reorderError && (
                  <div style={{
                    padding: '12px 16px',
                    background: 'var(--accent-coral-light)',
                    border: '1px solid var(--accent-coral-border)',
                    borderRadius: '8px',
                    color: 'var(--accent-coral-text)',
                    fontSize: '13px',
                    marginBottom: '16px'
                  }}>
                    {reorderError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button onClick={handleCloseReorder} className="btn btn-secondary">
                    Close
                  </button>
                  <button
                    onClick={handleExecuteReorder}
                    disabled={isReordering}
                    className="btn btn-primary"
                  >
                    {isReordering ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Evaluating...
                      </>
                    ) : (
                      'Run Reorder Scan'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Universal Batch & Polymer Genealogy Engine Modal */}
      <BatchGenealogyModal
        isOpen={showTraceModal}
        onClose={() => setShowTraceModal(false)}
        initialBatchId={traceBatchId}
      />

      {/* Delete Raw Material SKU Confirmation Modal */}
      {materialToDelete && (
        <div className="modal-backdrop" onClick={() => setMaterialToDelete(null)}>
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
                  Deactivate Raw Material SKU?
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Are you sure you want to deactivate{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {materialToDelete.materialName} ({materialToDelete.materialCode})
                  </strong>
                  ? It will be marked inactive and hidden from new inward batches while preserving historical consumption genealogy.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setMaterialToDelete(null)}
                disabled={deletingMaterial}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    setDeletingMaterial(true);
                    await inventoryApi.deleteRawMaterial(materialToDelete.materialId);
                    setMaterialToDelete(null);
                    fetchMaterials();
                  } catch (err) {
                    alert(`Failed to deactivate raw material: ${err.response?.data?.message || err.message}`);
                  } finally {
                    setDeletingMaterial(false);
                  }
                }}
                disabled={deletingMaterial}
                className="btn btn-sm"
                style={{ background: '#EF4444', color: '#fff', border: 'none' }}
              >
                {deletingMaterial ? 'Deactivating...' : 'Confirm Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

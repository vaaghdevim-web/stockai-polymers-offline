import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Layers,
  MapPin,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Search,
  Hash,
  ShieldCheck,
  Grid3X3,
  List,
  FolderTree,
  Maximize2,
  X,
  Plus,
  Pencil,
  Trash2,
  Eraser
} from 'lucide-react';
import {
  getWarehouses,
  getWarehouseStorageHierarchy,
  getBinOccupancy,
  clearBinStock,
  clearAllWarehouseStock,
  flattenHierarchyBins,
  extractErrorMessage
} from '../services/domain/warehouseService';
import { formatPlantName } from '../utils/brand';
import { useAuth } from '../context/AuthContext';
import CreateWarehouseModal from '../components/CreateWarehouseModal';
import EditWarehouseModal from '../components/EditWarehouseModal';
import DeleteWarehouseModal from '../components/DeleteWarehouseModal';
import CreateRackModal from '../components/CreateRackModal';
import EditRackModal from '../components/EditRackModal';
import DeleteRackModal from '../components/DeleteRackModal';
import CreateShelfModal from '../components/CreateShelfModal';
import CreateBinModal from '../components/CreateBinModal';
import EditBinModal from '../components/EditBinModal';
import DeleteBinModal from '../components/DeleteBinModal';

export default function WarehouseManagement() {
  const { user } = useAuth();
  const userRoles = (user?.roles || []).map((r) => String(r).toUpperCase().replace(/^ROLE_/, ''));
  const canManageStorage = userRoles.some((r) => ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(r));

  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
  const [storageTree, setStorageTree] = useState(null);
  const [flatBins, setFlatBins] = useState([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  const [loadingHierarchy, setLoadingHierarchy] = useState(false);
  const [error, setError] = useState(null);
  const [hierarchyError, setHierarchyError] = useState(null);
  const [viewMode, setViewMode] = useState('tree'); // 'tree' | 'table'
  const [filterType, setFilterType] = useState('ALL');
  const [search, setSearch] = useState('');
  const [binSearch, setBinSearch] = useState('');

  // Creation & Edit/Delete Modals State
  const [isCreateWarehouseOpen, setIsCreateWarehouseOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [isEditWarehouseOpen, setIsEditWarehouseOpen] = useState(false);
  const [deletingWarehouse, setDeletingWarehouse] = useState(null);
  const [isDeleteWarehouseOpen, setIsDeleteWarehouseOpen] = useState(false);
  const [isCreateRackOpen, setIsCreateRackOpen] = useState(false);
  const [editingRack, setEditingRack] = useState(null);
  const [isEditRackOpen, setIsEditRackOpen] = useState(false);
  const [deletingRack, setDeletingRack] = useState(null);
  const [isDeleteRackOpen, setIsDeleteRackOpen] = useState(false);

  const [isCreateShelfOpen, setIsCreateShelfOpen] = useState(false);
  const [shelfTargetRack, setShelfTargetRack] = useState(null);

  const [isCreateBinOpen, setIsCreateBinOpen] = useState(false);
  const [binTargetRack, setBinTargetRack] = useState(null);
  const [binTargetShelf, setBinTargetShelf] = useState(null);
  const [editingBin, setEditingBin] = useState(null);
  const [isEditBinOpen, setIsEditBinOpen] = useState(false);
  const [deletingBin, setDeletingBin] = useState(null);
  const [isDeleteBinOpen, setIsDeleteBinOpen] = useState(false);

  // Bin Occupancy Detail Modal State
  const [inspectedBin, setInspectedBin] = useState(null);
  const [loadingOccupancy, setLoadingOccupancy] = useState(false);
  const [occupancyError, setOccupancyError] = useState(null);

  const fetchWarehouses = useCallback(async () => {
    try {
      setLoadingWarehouses(true);
      setError(null);
      const res = await getWarehouses();
      const list = Array.isArray(res.data) ? res.data : [];
      setWarehouses(list);

      // Default select first warehouse if none selected
      if (list.length > 0) {
        setSelectedWarehouseId((prev) => {
          if (!prev || !list.some((w) => w.warehouseId === prev)) {
            return list[0].warehouseId;
          }
          return prev;
        });
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load warehouses from backend.'));
    } finally {
      setLoadingWarehouses(false);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const fetchStorageHierarchy = useCallback(async (warehouseId, currentWarehouse = null) => {
    if (!warehouseId) {
      setStorageTree(null);
      setFlatBins([]);
      return;
    }
    try {
      setLoadingHierarchy(true);
      setHierarchyError(null);

      const targetWh = currentWarehouse || warehouses.find((w) => w.warehouseId === warehouseId) || null;
      // Query full storage hierarchy (Warehouse -> Racks -> Shelves -> Bins)
      const res = await getWarehouseStorageHierarchy(warehouseId, targetWh);
      const tree = res.data;
      setStorageTree(tree);

      const rawBins = res.rawBins && res.rawBins.length > 0 ? res.rawBins : flattenHierarchyBins(tree);
      setFlatBins(rawBins);
    } catch (err) {
      setHierarchyError(extractErrorMessage(err, 'Failed to fetch warehouse storage hierarchy.'));
      setStorageTree(null);
      setFlatBins([]);
    } finally {
      setLoadingHierarchy(false);
    }
  }, [warehouses]);

  useEffect(() => {
    if (selectedWarehouseId) {
      fetchStorageHierarchy(selectedWarehouseId);
    }
  }, [selectedWarehouseId, fetchStorageHierarchy]);

  // Open real-time bin occupancy modal
  const handleInspectBin = async (bin) => {
    setInspectedBin({
      ...bin,
      warehouseName: bin.warehouseName || selectedWarehouse?.warehouseName,
      batches: [],
      pallets: [],
    });
    setLoadingOccupancy(true);
    setOccupancyError(null);

    try {
      const res = await getBinOccupancy(bin.binId);
      if (res.data) {
        const binData = res.data.bin || {};
        setInspectedBin((prev) => ({
          ...prev,
          ...binData,
          batches: res.data.batches || [],
          pallets: res.data.pallets || [],
        }));
      }
    } catch (err) {
      console.warn('Could not fetch granular occupancy:', err);
    } finally {
      setLoadingOccupancy(false);
    }
  };

  const handleCloseInspect = () => {
    setInspectedBin(null);
    setOccupancyError(null);
  };

  const handleClearBinStock = async (bin) => {
    if (!bin?.binId) return;
    const binCode = bin.binCode || 'this bin';
    if (!window.confirm(`Are you sure you want to clear and wipe all stored stock/pallets for ${binCode}? This will reset its stored stock to 0 kg.`)) {
      return;
    }
    try {
      await clearBinStock(bin.binId);
      if (selectedWarehouseId) {
        await fetchStorageHierarchy(selectedWarehouseId, selectedWarehouse);
      }
      if (inspectedBin && inspectedBin.binId === bin.binId) {
        setInspectedBin((prev) => prev ? {
          ...prev,
          currentStockKg: 0,
          availableCapacityKg: prev.capacityKg || 5000,
          utilizationPct: 0,
          activePalletCount: 0,
          isOverCapacity: false,
          batches: [],
          pallets: []
        } : null);
      }
    } catch (err) {
      alert(extractErrorMessage(err, 'Failed to clear bin stock.'));
    }
  };

  const handleClearAllWarehouseStock = async () => {
    if (!selectedWarehouseId) return;
    const whName = selectedWarehouse?.warehouseName || 'this warehouse';
    if (!window.confirm(`Are you sure you want to reset and clear ALL stored stock across all bins in "${whName}"? All bins will be reset to 0 kg so you can start completely fresh.`)) {
      return;
    }
    try {
      await clearAllWarehouseStock(selectedWarehouseId);
      await fetchStorageHierarchy(selectedWarehouseId, selectedWarehouse);
      if (inspectedBin) {
        setInspectedBin(null);
      }
    } catch (err) {
      alert(extractErrorMessage(err, 'Failed to clear warehouse stock.'));
    }
  };

  const selectedWarehouse = warehouses.find((w) => w.warehouseId === selectedWarehouseId) || null;

  const filteredWarehouses = warehouses.filter((w) => {
    const matchesType = filterType === 'ALL' || (w.type && w.type.toLowerCase().includes(filterType.toLowerCase()));
    const query = search.toLowerCase();
    const matchesSearch =
      (w.warehouseName && w.warehouseName.toLowerCase().includes(query)) ||
      (w.plantName && w.plantName.toLowerCase().includes(query)) ||
      (w.type && w.type.toLowerCase().includes(query));
    return matchesType && matchesSearch;
  });

  const filteredBins = flatBins.filter((b) => {
    const query = binSearch.toLowerCase();
    return (
      (b.binCode && b.binCode.toLowerCase().includes(query)) ||
      (b.rackCode && b.rackCode.toLowerCase().includes(query)) ||
      (b.shelfCode && b.shelfCode.toLowerCase().includes(query))
    );
  });

  const totalCap = Number(storageTree?.totalCapacityKg || 0);
  const currentStock = Number(storageTree?.totalCurrentStockKg || 0);
  const availCap = storageTree?.totalAvailableCapacityKg !== null && storageTree?.totalAvailableCapacityKg !== undefined
    ? Number(storageTree.totalAvailableCapacityKg)
    : Math.max(0, totalCap - currentStock);
  const utilPct = storageTree?.overallUtilizationPct !== null && storageTree?.overallUtilizationPct !== undefined
    ? Number(storageTree.overallUtilizationPct)
    : (totalCap > 0 ? (currentStock * 100) / totalCap : 0);

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Plant Warehouses & Storage Bin Architecture
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Physical location topology, racks, shelves, and storage bin registry (Live Backend Synchronized)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => {
              fetchWarehouses();
              if (selectedWarehouseId) fetchStorageHierarchy(selectedWarehouseId);
            }}
            disabled={loadingWarehouses || loadingHierarchy}
            className="btn btn-secondary btn-sm"
            title="Refresh Warehouse Registry"
          >
            <RefreshCw size={13} className={loadingWarehouses || loadingHierarchy ? 'animate-spin' : ''} /> Refresh
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
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid-kpi-4">
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Total Facilities</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
            {warehouses.length}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--accent-cyan)' }}>Registered in Factory Master</span>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Selected Warehouse</span>
          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selectedWarehouse ? selectedWarehouse.warehouseName : 'None Selected'}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{formatPlantName(selectedWarehouse?.plantName)}</span>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Warehouse Capacity</span>
          <div className="font-mono" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-cyan)', marginTop: '4px' }}>
            {totalCap > 0 ? `${totalCap.toLocaleString()} kg` : '0 kg'}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            Stored: <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{currentStock.toLocaleString()} kg</strong>
          </span>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Facility Utilization</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
            <span className="font-mono" style={{ fontSize: '20px', fontWeight: '800', color: utilPct > 90 ? 'var(--accent-coral)' : 'var(--accent-emerald)' }}>
              {utilPct.toFixed(1)}%
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Avail: <strong className="font-mono" style={{ color: 'var(--accent-emerald)' }}>{availCap.toLocaleString()} kg</strong>
            </span>
          </div>
          {/* Mini progress bar */}
          <div style={{ width: '100%', height: '4px', background: 'var(--bg-surface-active)', borderRadius: '2px', overflow: 'hidden', marginTop: '6px' }}>
            <div
              style={{
                width: `${Math.min(100, Math.max(0, utilPct))}%`,
                height: '100%',
                background: utilPct > 90 ? 'var(--accent-coral)' : utilPct > 70 ? 'var(--accent-amber)' : 'var(--accent-cyan)',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Left Warehouse List, Right Storage Hierarchy */}
      <div className="responsive-split-pane">
        {/* Left: Warehouse List */}
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={14} color="var(--accent-cyan)" /> Warehouses ({filteredWarehouses.length})
            </h2>
            {canManageStorage && (
              <button
                onClick={() => setIsCreateWarehouseOpen(true)}
                className="btn btn-primary btn-xs"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '3px 8px' }}
                title="Create a new warehouse facility"
              >
                <Plus size={12} /> Create Warehouse
              </button>
            )}
          </div>

          {/* Search & Filters */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="input"
              placeholder="Search warehouses or plants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '30px', fontSize: '12px' }}
            />
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['ALL', 'Raw', 'FG', 'Both'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`btn btn-xs ${filterType === t ? 'btn-primary' : 'btn-ghost'}`}
              >
                {t === 'ALL' ? 'All Types' : t === 'Raw' ? 'Raw Materials' : t === 'FG' ? 'Finished Goods' : 'Multi-purpose'}
              </button>
            ))}
          </div>

          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {loadingWarehouses ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '12px' }}>
                <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                Loading warehouse registry...
              </div>
            ) : filteredWarehouses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '12px' }}>
                No warehouses match your filter.
              </div>
            ) : (
              filteredWarehouses.map((wh) => {
                const isSelected = wh.warehouseId === selectedWarehouseId;
                return (
                  <div
                    key={wh.warehouseId}
                    onClick={() => setSelectedWarehouseId(wh.warehouseId)}
                    style={{
                      background: isSelected ? 'rgba(0, 210, 255, 0.08)' : 'var(--bg-surface)',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.12s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                        {wh.warehouseName}
                      </span>
                      <span
                        style={{
                          fontSize: '9.5px',
                          fontFamily: 'var(--font-mono)',
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-xs)',
                          background: wh.isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: wh.isActive ? 'var(--accent-emerald)' : 'var(--accent-coral)',
                          fontWeight: '700'
                        }}
                      >
                        {wh.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <MapPin size={11} />
                      <span>{formatPlantName(wh.plantName)}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)', fontSize: '11px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        Type: <strong>{wh.type || 'Standard'}</strong>
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
                          WH ID: #{wh.warehouseId}
                        </span>
                        {canManageStorage && (
                          <div style={{ display: 'flex', gap: '2px', marginLeft: '4px' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingWarehouse(wh);
                                setIsEditWarehouseOpen(true);
                              }}
                              className="btn btn-ghost btn-xs"
                              style={{ padding: '2px 4px', color: 'var(--text-muted)' }}
                              title="Edit this warehouse"
                            >
                              <Pencil size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingWarehouse(wh);
                                setIsDeleteWarehouseOpen(true);
                              }}
                              className="btn btn-ghost btn-xs"
                              style={{ padding: '2px 4px', color: 'var(--accent-coral)' }}
                              title="Delete this warehouse"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Storage Hierarchy & Bins Explorer */}
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
          {selectedWarehouse ? (
            <>
              {/* Selected Warehouse Details Card */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                      {selectedWarehouse.warehouseName}
                    </h2>
                    <span
                      style={{
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-xs)',
                        background: 'rgba(0, 210, 255, 0.12)',
                        color: 'var(--accent-cyan)',
                        fontWeight: '700'
                      }}
                    >
                      {selectedWarehouse.type || 'General'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '14px', marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span>Plant: <strong>{formatPlantName(selectedWarehouse.plantName)}</strong></span>
                    <span>System ID: <strong className="font-mono">#{selectedWarehouse.warehouseId}</strong></span>
                    <span>Racks: <strong className="font-mono">{hierarchyError ? '—' : (storageTree?.totalRacks ?? 0)}</strong></span>
                    <span>Shelves: <strong className="font-mono">{hierarchyError ? '—' : (storageTree?.totalShelves ?? 0)}</strong></span>
                    <span>Bins: <strong className="font-mono">{hierarchyError ? '—' : (storageTree?.totalBins ?? flatBins.length)}</strong></span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* View Mode Toggle */}
                  <div style={{ display: 'flex', background: 'var(--bg-surface-active)', borderRadius: 'var(--radius-xs)', padding: '2px', border: '1px solid var(--border-subtle)' }}>
                    <button
                      onClick={() => setViewMode('tree')}
                      className={`btn btn-xs ${viewMode === 'tree' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="View as hierarchical storage topology (Racks -> Shelves -> Bins)"
                    >
                      <FolderTree size={12} /> Hierarchy Tree
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`btn btn-xs ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="View as searchable flat bins table"
                    >
                      <List size={12} /> Bins Table
                    </button>
                  </div>

                  <button
                    onClick={() => fetchStorageHierarchy(selectedWarehouse.warehouseId)}
                    disabled={loadingHierarchy}
                    className="btn btn-secondary btn-sm"
                    title="Reload storage hierarchy and bin occupancy"
                  >
                    <RefreshCw size={12} className={loadingHierarchy ? 'animate-spin' : ''} /> Sync
                  </button>

                  {canManageStorage && (
                    <>
                      <button
                        onClick={() => {
                          setEditingWarehouse(selectedWarehouse);
                          setIsEditWarehouseOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                        title="Edit warehouse details (name, plant, storage type)"
                      >
                        <Pencil size={13} /> Edit Warehouse
                      </button>
                      <button
                        onClick={() => {
                          setDeletingWarehouse(selectedWarehouse);
                          setIsDeleteWarehouseOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#DC2626', borderColor: '#FECACA' }}
                        title="Delete or deactivate this warehouse"
                      >
                        <Trash2 size={13} color="#DC2626" /> Delete Warehouse
                      </button>
                      <button
                        onClick={handleClearAllWarehouseStock}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#DC2626', borderColor: '#FECACA' }}
                        title="Clear all stored stock across all bins in this warehouse to start fresh"
                      >
                        <Eraser size={13} color="#DC2626" /> Reset All Bins
                      </button>
                      <button
                        onClick={() => setIsCreateRackOpen(true)}
                        className="btn btn-primary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                        title="Add storage rack to this warehouse"
                      >
                        <Plus size={13} /> Add Rack
                      </button>
                    </>
                  )}
                </div>
              </div>

              {hierarchyError && (
                <div
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 'var(--radius-xs)',
                    color: 'var(--accent-coral)',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <AlertCircle size={14} />
                  <span>{hierarchyError}</span>
                </div>
              )}

              {/* View 1: Hierarchical Storage Tree (Warehouse -> Racks -> Shelves -> Bins) */}
              {viewMode === 'tree' && (
                <div>
                  {loadingHierarchy ? (
                    <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
                      Loading storage tree hierarchy and live bin occupancy from backend...
                    </div>
                  ) : !storageTree || !storageTree.racks || storageTree.racks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)', fontSize: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                      <Grid3X3 size={28} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
                      <p style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>No Storage Racks Configured</p>
                      <p style={{ fontSize: '11.5px', marginTop: '4px', marginBottom: '14px' }}>
                        This facility currently does not have physical storage racks, shelves, or location bins defined in the layout registry.
                      </p>
                      {canManageStorage && (
                        <button
                          onClick={() => setIsCreateRackOpen(true)}
                          className="btn btn-primary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Plus size={13} /> Add First Rack
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {storageTree.racks.map((rack) => {
                        const rackCap = Number(rack.totalCapacityKg || 0);
                        const rackStock = Number(rack.totalCurrentStockKg || 0);
                        const rackAvail = Number(rack.totalAvailableCapacityKg || 0);
                        const rackUtil = Number(rack.utilizationPct || 0);

                        return (
                          <div
                            key={rack.rackId}
                            style={{
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-default)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '14px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px'
                            }}
                          >
                            {/* Rack Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FolderTree size={16} color="var(--accent-cyan)" />
                                <span className="font-mono" style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                  Rack {rack.rackCode}
                                </span>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                  ({rack.totalShelves || (rack.shelves ? rack.shelves.length : 0)} Shelves, {rack.totalBins || 0} Bins)
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>
                                    Cap: <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{rackCap.toLocaleString()} kg</strong>
                                  </span>
                                  <span style={{ color: 'var(--text-muted)' }}>
                                    Stored: <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{rackStock.toLocaleString()} kg</strong>
                                  </span>
                                  <span style={{ color: 'var(--text-muted)' }}>
                                    Avail: <strong className="font-mono" style={{ color: 'var(--accent-emerald)' }}>{rackAvail.toLocaleString()} kg</strong>
                                  </span>
                                  <span
                                    className="font-mono"
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      padding: '2px 6px',
                                      borderRadius: 'var(--radius-xs)',
                                      background: rackUtil > 90 ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-surface-active)',
                                      color: rackUtil > 90 ? 'var(--accent-coral)' : 'var(--accent-cyan)'
                                    }}
                                  >
                                    {rackUtil.toFixed(1)}% Used
                                  </span>
                                </div>

                                {canManageStorage && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <button
                                      onClick={() => {
                                        setEditingRack(rack);
                                        setIsEditRackOpen(true);
                                      }}
                                      className="btn btn-ghost btn-xs"
                                      style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', padding: '2px 7px', border: '1px solid var(--border-subtle)' }}
                                      title={`Edit ${rack.rackCode}`}
                                    >
                                      <Pencil size={11} /> Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        setDeletingRack(rack);
                                        setIsDeleteRackOpen(true);
                                      }}
                                      className="btn btn-ghost btn-xs text-coral"
                                      style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', padding: '2px 7px', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                                      title={`Delete ${rack.rackCode}`}
                                    >
                                      <Trash2 size={11} color="var(--accent-coral)" /> Delete
                                    </button>
                                    <button
                                      onClick={() => {
                                        setShelfTargetRack(rack);
                                        setIsCreateShelfOpen(true);
                                      }}
                                      className="btn btn-secondary btn-xs"
                                      style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '2px 8px' }}
                                      title={`Add storage shelf to ${rack.rackCode}`}
                                    >
                                      <Plus size={11} /> Add Shelf
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Shelves List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '8px' }}>
                              {(!rack.shelves || rack.shelves.length === 0) ? (
                                <div style={{ textAlign: 'center', padding: '16px 10px', background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-xs)', color: 'var(--text-muted)', fontSize: '11.5px' }}>
                                  <p style={{ margin: '0 0 6px 0' }}>No shelves configured in this rack.</p>
                                  {canManageStorage && (
                                    <button
                                      onClick={() => {
                                        setShelfTargetRack(rack);
                                        setIsCreateShelfOpen(true);
                                      }}
                                      className="btn btn-secondary btn-xs"
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    >
                                      <Plus size={11} /> Add First Shelf
                                    </button>
                                  )}
                                </div>
                              ) : (
                                rack.shelves.map((shelf) => {
                                  const shelfCap = Number(shelf.totalCapacityKg || 0);
                                  const shelfStock = Number(shelf.totalCurrentStockKg || 0);
                                  const shelfAvail = Number(shelf.totalAvailableCapacityKg || 0);
                                  const shelfUtil = Number(shelf.utilizationPct || 0);

                                  return (
                                    <div
                                      key={shelf.shelfId}
                                      style={{
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: 'var(--radius-xs)',
                                        padding: '10px 12px'
                                      }}
                                    >
                                      {/* Shelf Header */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <Hash size={13} color="var(--accent-amber)" />
                                          <span className="font-mono" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                            Shelf {shelf.shelfCode}
                                          </span>
                                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                            (Level {shelf.shelfLevel}, {shelf.totalBins || (shelf.bins ? shelf.bins.length : 0)} Bins)
                                          </span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                          <div style={{ display: 'flex', gap: '10px', fontSize: '10.5px' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>
                                              Cap: <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{shelfCap.toLocaleString()} kg</strong>
                                            </span>
                                            <span style={{ color: 'var(--text-muted)' }}>
                                              Stored: <strong className="font-mono">{shelfStock.toLocaleString()} kg</strong>
                                            </span>
                                            <span style={{ color: 'var(--text-muted)' }}>
                                              Avail: <strong className="font-mono" style={{ color: 'var(--accent-emerald)' }}>{shelfAvail.toLocaleString()} kg</strong>
                                            </span>
                                            <span className="font-mono" style={{ fontSize: '10px', color: 'var(--accent-cyan)' }}>
                                              ({shelfUtil.toFixed(1)}%)
                                            </span>
                                          </div>

                                          {canManageStorage && (
                                            <button
                                              onClick={() => {
                                                setBinTargetRack(rack);
                                                setBinTargetShelf(shelf);
                                                setIsCreateBinOpen(true);
                                              }}
                                              className="btn btn-ghost btn-xs"
                                              style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', padding: '2px 6px', border: '1px solid var(--border-subtle)' }}
                                              title={`Add storage bin to ${shelf.shelfCode}`}
                                            >
                                              <Plus size={10} /> Add Bin
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      {/* Bins Grid */}
                                      {(!shelf.bins || shelf.bins.length === 0) ? (
                                        <div style={{ textAlign: 'center', padding: '14px 10px', background: 'var(--bg-surface)', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-xs)', color: 'var(--text-muted)', fontSize: '11px' }}>
                                          <p style={{ margin: '0 0 6px 0' }}>No storage bins configured in this shelf.</p>
                                          {canManageStorage && (
                                            <button
                                              onClick={() => {
                                                setBinTargetRack(rack);
                                                setBinTargetShelf(shelf);
                                                setIsCreateBinOpen(true);
                                              }}
                                              className="btn btn-secondary btn-xs"
                                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                            >
                                              <Plus size={10} /> Add First Bin
                                            </button>
                                          )}
                                        </div>
                                      ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                                          {shelf.bins.map((bin) => {
                                            const bCap = Number(bin.capacityKg || 0);
                                            const bStock = Number(bin.currentStockKg || 0);
                                            const bAvail = Number(bin.availableCapacityKg || 0);
                                            const bUtil = Number(bin.utilizationPct || 0);

                                            return (
                                              <div
                                                key={bin.binId}
                                                style={{
                                                  background: 'var(--bg-surface)',
                                                  border: '1px solid',
                                                  borderColor: bin.isOverCapacity ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-subtle)',
                                                  borderRadius: 'var(--radius-xs)',
                                                  padding: '10px',
                                                  display: 'flex',
                                                  flexDirection: 'column',
                                                  gap: '6px'
                                                }}
                                              >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Layers size={13} color="var(--accent-cyan)" />
                                                    <span className="font-mono" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                                                      {bin.binCode}
                                                    </span>
                                                  </div>
                                                  {bin.isOverCapacity ? (
                                                    <span className="badge badge-coral" style={{ fontSize: '9px', padding: '1px 5px' }}>
                                                      OVER
                                                    </span>
                                                  ) : bUtil >= 90 ? (
                                                    <span className="badge badge-amber" style={{ fontSize: '9px', padding: '1px 5px' }}>
                                                      NEAR FULL
                                                    </span>
                                                  ) : (
                                                    <span className="badge badge-emerald" style={{ fontSize: '9px', padding: '1px 5px' }}>
                                                      AVAIL
                                                    </span>
                                                  )}
                                                </div>

                                                {/* Capacity Progress Bar */}
                                                <div style={{ width: '100%', height: '4px', background: 'var(--bg-surface-active)', borderRadius: '2px', overflow: 'hidden', margin: '2px 0' }}>
                                                  <div
                                                    style={{
                                                      width: `${Math.min(100, Math.max(0, bUtil))}%`,
                                                      height: '100%',
                                                      background: bin.isOverCapacity ? 'var(--accent-coral)' : bUtil >= 90 ? 'var(--accent-amber)' : 'var(--accent-cyan)'
                                                    }}
                                                  />
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px' }}>
                                                  <span style={{ color: 'var(--text-muted)' }}>Cap:</span>
                                                  <span className="font-mono">{bCap.toLocaleString()} kg</span>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px' }}>
                                                  <span style={{ color: 'var(--text-muted)' }}>Stored:</span>
                                                  <span className="font-mono" style={{ fontWeight: '600', color: bin.isOverCapacity ? 'var(--accent-coral)' : 'var(--text-primary)' }}>
                                                    {bStock.toLocaleString()} kg
                                                  </span>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px' }}>
                                                  <span style={{ color: 'var(--text-muted)' }}>Remaining:</span>
                                                  <span className="font-mono" style={{ fontWeight: '600', color: bin.isOverCapacity ? 'var(--accent-coral)' : 'var(--accent-emerald)' }}>
                                                    {bin.isOverCapacity ? '0 kg' : `${bAvail.toLocaleString()} kg`}
                                                  </span>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--border-subtle)' }}>
                                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                                    Pallets: <strong className="font-mono">{bin.activePalletCount || 0}</strong>
                                                  </span>
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                    <button
                                                      onClick={() => handleInspectBin({ ...bin, shelfCode: shelf.shelfCode, rackCode: rack.rackCode })}
                                                      className="btn btn-ghost btn-xs"
                                                      style={{ padding: '2px 5px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '2px' }}
                                                      title="Inspect details"
                                                    >
                                                      <Maximize2 size={10} /> Inspect
                                                    </button>
                                                    {canManageStorage && (
                                                      <>
                                                        {(Number(bin.currentStockKg || 0) > 0 || Number(bin.activePalletCount || 0) > 0) && (
                                                          <button
                                                            onClick={() => handleClearBinStock({ ...bin, shelfCode: shelf.shelfCode, rackCode: rack.rackCode })}
                                                            className="btn btn-ghost btn-xs"
                                                            style={{ padding: '2px 5px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--accent-amber)' }}
                                                            title="Clear and wipe stock (Reset to 0 kg)"
                                                          >
                                                            <Eraser size={10} color="var(--accent-amber)" />
                                                          </button>
                                                        )}
                                                        <button
                                                          onClick={() => {
                                                            setEditingBin({ ...bin, shelfCode: shelf.shelfCode, rackCode: rack.rackCode, warehouseName: selectedWarehouse?.warehouseName });
                                                            setIsEditBinOpen(true);
                                                          }}
                                                          className="btn btn-ghost btn-xs"
                                                          style={{ padding: '2px 5px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '2px' }}
                                                          title="Edit Bin Name / Capacity"
                                                        >
                                                          <Pencil size={10} /> Edit
                                                        </button>
                                                        <button
                                                          onClick={() => {
                                                            setDeletingBin({ ...bin, shelfCode: shelf.shelfCode, rackCode: rack.rackCode });
                                                            setIsDeleteBinOpen(true);
                                                          }}
                                                          className="btn btn-ghost btn-xs"
                                                          style={{ padding: '2px 5px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--accent-coral)' }}
                                                          title="Delete Bin"
                                                        >
                                                          <Trash2 size={10} color="var(--accent-coral)" />
                                                        </button>
                                                      </>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* View 2: Searchable Flat Bins Table */}
              {viewMode === 'table' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Bins Toolbar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <div style={{ position: 'relative', width: '280px' }}>
                      <input
                        type="text"
                        className="input"
                        placeholder="Filter by bin, rack, or shelf code..."
                        value={binSearch}
                        onChange={(e) => setBinSearch(e.target.value)}
                        style={{ paddingLeft: '28px', fontSize: '11px' }}
                      />
                      <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '9px' }} />
                    </div>

                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Total Bins: <strong>{filteredBins.length}</strong>
                    </span>
                  </div>

                  {/* Bins Table */}
                  <div className="data-table-container" style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                    {loadingHierarchy ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                        Loading storage bins from backend...
                      </div>
                    ) : filteredBins.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        <Grid3X3 size={24} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                        <p style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>No Storage Bins Found</p>
                        <p style={{ fontSize: '11px', marginTop: '4px' }}>
                          {binSearch ? 'No bins match the active search query.' : 'This warehouse does not have any physical location bins configured in the database.'}
                        </p>
                      </div>
                    ) : (
                      <table className="table" style={{ width: '100%', fontSize: '12px' }}>
                        <thead>
                          <tr>
                            <th>Bin Identifier</th>
                            <th>Rack</th>
                            <th>Shelf</th>
                            <th>Max Capacity</th>
                            <th>Current Stock</th>
                            <th>Remaining Available</th>
                            <th>Utilization</th>
                            <th>Pallets</th>
                            <th style={{ textAlign: 'center' }}>Status</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredBins.map((bin) => {
                            const bCap = Number(bin.capacityKg || 0);
                            const bStock = Number(bin.currentStockKg || 0);
                            const bAvail = Number(bin.availableCapacityKg || 0);
                            const bUtil = Number(bin.utilizationPct || 0);

                            return (
                              <tr key={bin.binId}>
                                <td style={{ fontWeight: '700', color: 'var(--accent-cyan)' }} className="font-mono">
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <Layers size={13} color="var(--accent-cyan)" />
                                    {bin.binCode}
                                  </span>
                                </td>
                                <td className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                                  {bin.rackCode || '—'}
                                </td>
                                <td className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                                  {bin.shelfCode || '—'}
                                </td>
                                <td className="font-mono" style={{ color: 'var(--text-primary)' }}>
                                  {bCap.toLocaleString()} kg
                                </td>
                                <td className="font-mono" style={{ fontWeight: '600', color: bin.isOverCapacity ? 'var(--accent-coral)' : 'var(--text-primary)' }}>
                                  {bStock.toLocaleString()} kg
                                </td>
                                <td className="font-mono" style={{ fontWeight: '600', color: bin.isOverCapacity ? 'var(--accent-coral)' : 'var(--accent-emerald)' }}>
                                  {bin.isOverCapacity ? '0 kg' : `${bAvail.toLocaleString()} kg`}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '50px', height: '4px', background: 'var(--bg-surface-active)', borderRadius: '2px', overflow: 'hidden' }}>
                                      <div
                                        style={{
                                          width: `${Math.min(100, Math.max(0, bUtil))}%`,
                                          height: '100%',
                                          background: bin.isOverCapacity ? 'var(--accent-coral)' : bUtil >= 90 ? 'var(--accent-amber)' : 'var(--accent-cyan)'
                                        }}
                                      />
                                    </div>
                                    <span className="font-mono" style={{ fontSize: '11px', color: bin.isOverCapacity ? 'var(--accent-coral)' : 'var(--text-secondary)' }}>
                                      {bUtil.toFixed(1)}%
                                    </span>
                                  </div>
                                </td>
                                <td className="font-mono" style={{ color: 'var(--text-muted)' }}>
                                  {bin.activePalletCount || 0}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {bin.isOverCapacity ? (
                                    <span className="badge badge-coral" style={{ fontSize: '9px', padding: '1px 6px' }}>
                                      OVER CAPACITY
                                    </span>
                                  ) : bin.isActive ? (
                                    <span className="badge badge-emerald" style={{ fontSize: '9px', padding: '1px 6px' }}>
                                      ACTIVE
                                    </span>
                                  ) : (
                                    <span className="badge badge-coral" style={{ fontSize: '9px', padding: '1px 6px' }}>
                                      INACTIVE
                                    </span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <button
                                      onClick={() => handleInspectBin(bin)}
                                      className="btn btn-ghost btn-xs"
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10.5px', padding: '2px 6px', border: '1px solid var(--border-subtle)' }}
                                    >
                                      <Maximize2 size={11} /> Inspect
                                    </button>
                                    {canManageStorage && (
                                      <>
                                        <button
                                          onClick={() => {
                                            setEditingBin(bin);
                                            setIsEditBinOpen(true);
                                          }}
                                          className="btn btn-ghost btn-xs"
                                          style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10.5px', padding: '2px 6px', border: '1px solid var(--border-subtle)' }}
                                          title="Edit Bin"
                                        >
                                          <Pencil size={11} /> Edit
                                        </button>
                                        <button
                                          onClick={() => {
                                            setDeletingBin(bin);
                                            setIsDeleteBinOpen(true);
                                          }}
                                          className="btn btn-ghost btn-xs text-coral"
                                          style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10.5px', padding: '2px 6px', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                                          title="Delete Bin"
                                        >
                                          <Trash2 size={11} color="var(--accent-coral)" /> Delete
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
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Select a warehouse on the left to inspect its storage hierarchy.
            </div>
          )}
        </div>
      </div>

      {/* Bin Occupancy Detail Modal */}
      {inspectedBin && (
        <div className="modal-backdrop" onClick={handleCloseInspect}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '580px', padding: '22px' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} color="var(--accent-cyan)" />
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                    Storage Bin Topology & Real Occupancy
                  </h3>
                  {loadingOccupancy && <RefreshCw size={13} className="animate-spin" color="var(--accent-cyan)" />}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Bin: <strong className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{inspectedBin.binCode}</strong>
                  {' — '}
                  <span>{inspectedBin.warehouseName || selectedWarehouse?.warehouseName}</span>
                </div>
              </div>
              <button onClick={handleCloseInspect} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            {occupancyError && (
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
                <AlertCircle size={15} />
                <span>{occupancyError}</span>
              </div>
            )}

            {inspectedBin.isOverCapacity && (
              <div
                style={{
                  padding: '10px 12px',
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
                <AlertTriangle size={16} />
                <span>
                  <strong>Capacity Violation:</strong> This bin currently holds more inventory than its physical rated capacity.
                  Goods receipt into this bin will be rejected by ledger safety controls.
                </span>
              </div>
            )}

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '14px' }}>
              <div style={{ background: 'var(--bg-surface-active)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Physical Location</span>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '4px' }}>
                  Rack: <span className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{inspectedBin.rackCode || '—'}</span> / Shelf: <span className="font-mono">{inspectedBin.shelfCode || '—'}</span>
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-active)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rated Capacity</span>
                <div className="font-mono" style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {Number(inspectedBin.capacityKg || 0).toLocaleString()} kg
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-active)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Currently Stored Stock</span>
                <div className="font-mono" style={{ fontSize: '15px', fontWeight: '800', color: inspectedBin.isOverCapacity ? 'var(--accent-coral)' : 'var(--text-primary)', marginTop: '2px' }}>
                  {Number(inspectedBin.currentStockKg || 0).toLocaleString()} kg
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-active)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Remaining Available</span>
                <div className="font-mono" style={{ fontSize: '15px', fontWeight: '800', color: inspectedBin.isOverCapacity ? 'var(--accent-coral)' : 'var(--accent-emerald)', marginTop: '2px' }}>
                  {inspectedBin.isOverCapacity ? '0 kg' : `${Number(inspectedBin.availableCapacityKg || 0).toLocaleString()} kg`}
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-active)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Utilization Rate</span>
                <div className="font-mono" style={{ fontSize: '14px', fontWeight: '700', color: inspectedBin.isOverCapacity ? 'var(--accent-coral)' : 'var(--accent-cyan)', marginTop: '2px' }}>
                  {inspectedBin.utilizationPct !== null && inspectedBin.utilizationPct !== undefined ? `${Number(inspectedBin.utilizationPct).toFixed(1)}%` : '0%'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-active)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pallets / Bags Constraint</span>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Max: <strong className="font-mono">{inspectedBin.maxPallets || '—'}</strong> pallets / <strong className="font-mono">{inspectedBin.maxBags || '—'}</strong> bags
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Active Pallets: <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{inspectedBin.activePalletCount || 0}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Stored Batches Breakdown */}
            {inspectedBin.batches && inspectedBin.batches.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Stored Material Batches ({inspectedBin.batches.length})
                </span>
                <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <table className="table" style={{ width: '100%', fontSize: '11px' }}>
                    <thead>
                      <tr>
                        <th>Batch No</th>
                        <th>Material / Item</th>
                        <th>Qty on Hand</th>
                        <th>Quality</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspectedBin.batches.map((b, idx) => (
                        <tr key={idx}>
                          <td className="font-mono" style={{ fontWeight: '700', color: 'var(--accent-cyan)' }}>
                            {b.batchNo || '—'}
                          </td>
                          <td style={{ color: 'var(--text-primary)' }}>{b.itemName || '—'}</td>
                          <td className="font-mono" style={{ fontWeight: '700', color: 'var(--accent-emerald)' }}>
                            {Number(b.quantityOnHand || 0).toLocaleString()} kg
                          </td>
                          <td>
                            <span className="badge badge-cyan" style={{ fontSize: '9px', padding: '1px 5px' }}>
                              {b.qualityStatus || 'Available'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Backend Data Notice */}
            <div
              style={{
                padding: '10px 12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
                marginBottom: '16px'
              }}
            >
              <ShieldCheck size={14} color="var(--accent-cyan)" style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
              <strong>Inventory Aggregation:</strong> Occupancy is computed directly from active inventory ledger balances (<code className="font-mono">{Number(inspectedBin.currentStockKg || 0).toLocaleString()} kg</code>).
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {canManageStorage && (Number(inspectedBin.currentStockKg || 0) > 0 || Number(inspectedBin.activePalletCount || 0) > 0) && (
                  <button
                    onClick={() => handleClearBinStock(inspectedBin)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11.5px', color: 'var(--accent-coral)', borderColor: 'rgba(239, 68, 68, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    title="Wipe and clear all stock/pallets in this bin"
                  >
                    <Eraser size={13} color="var(--accent-coral)" /> Clear Bin Stock (Reset to 0 kg)
                  </button>
                )}
              </div>
              <button onClick={handleCloseInspect} className="btn btn-secondary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Warehouse Modal */}
      <CreateWarehouseModal
        isOpen={isCreateWarehouseOpen}
        onClose={() => setIsCreateWarehouseOpen(false)}
        onWarehouseCreated={async (newWh) => {
          await fetchWarehouses();
          if (newWh?.warehouseId) {
            setSelectedWarehouseId(newWh.warehouseId);
            await fetchStorageHierarchy(newWh.warehouseId, newWh);
          }
        }}
      />

      {/* Edit Warehouse Modal */}
      <EditWarehouseModal
        isOpen={isEditWarehouseOpen}
        warehouse={editingWarehouse || selectedWarehouse}
        onClose={() => {
          setIsEditWarehouseOpen(false);
          setEditingWarehouse(null);
        }}
        onWarehouseUpdated={async (updatedWh) => {
          await fetchWarehouses();
          if (updatedWh?.warehouseId) {
            await fetchStorageHierarchy(updatedWh.warehouseId, updatedWh);
          }
        }}
      />

      {/* Delete Warehouse Modal */}
      <DeleteWarehouseModal
        isOpen={isDeleteWarehouseOpen}
        warehouse={deletingWarehouse || selectedWarehouse}
        storageTree={storageTree}
        onClose={() => {
          setIsDeleteWarehouseOpen(false);
          setDeletingWarehouse(null);
        }}
        onWarehouseDeleted={async (deletedId) => {
          try {
            const res = await getWarehouses();
            const list = Array.isArray(res.data) ? res.data : [];
            setWarehouses(list);
            const remaining = list.filter((w) => w.warehouseId !== deletedId);
            if (remaining.length > 0) {
              setSelectedWarehouseId(remaining[0].warehouseId);
              await fetchStorageHierarchy(remaining[0].warehouseId, remaining[0]);
            } else {
              setSelectedWarehouseId(null);
              setStorageTree(null);
              setFlatBins([]);
            }
          } catch (err) {
            console.error('Failed to refresh warehouses after deletion:', err);
          }
        }}
      />

      {/* Create Rack Modal */}
      <CreateRackModal
        isOpen={isCreateRackOpen}
        warehouse={selectedWarehouse}
        onClose={() => setIsCreateRackOpen(false)}
        onRackCreated={async () => {
          if (selectedWarehouseId) {
            await fetchStorageHierarchy(selectedWarehouseId, selectedWarehouse);
          }
        }}
      />

      {/* Create Shelf Modal */}
      <CreateShelfModal
        isOpen={isCreateShelfOpen}
        warehouse={selectedWarehouse}
        rack={shelfTargetRack}
        onClose={() => {
          setIsCreateShelfOpen(false);
          setShelfTargetRack(null);
        }}
        onShelfCreated={async () => {
          if (selectedWarehouseId) {
            await fetchStorageHierarchy(selectedWarehouseId, selectedWarehouse);
          }
        }}
      />

      {/* Create Bin Modal */}
      <CreateBinModal
        isOpen={isCreateBinOpen}
        warehouse={selectedWarehouse}
        rack={binTargetRack}
        shelf={binTargetShelf}
        onClose={() => {
          setIsCreateBinOpen(false);
          setBinTargetRack(null);
          setBinTargetShelf(null);
        }}
        onBinCreated={async () => {
          if (selectedWarehouseId) {
            await fetchStorageHierarchy(selectedWarehouseId, selectedWarehouse);
          }
        }}
      />

      {/* Edit Rack Modal */}
      <EditRackModal
        isOpen={isEditRackOpen}
        rack={editingRack}
        warehouse={selectedWarehouse}
        onClose={() => {
          setIsEditRackOpen(false);
          setEditingRack(null);
        }}
        onRackUpdated={async () => {
          if (selectedWarehouseId) {
            await fetchStorageHierarchy(selectedWarehouseId, selectedWarehouse);
          }
        }}
      />

      {/* Delete Rack Modal */}
      <DeleteRackModal
        isOpen={isDeleteRackOpen}
        rack={deletingRack}
        warehouse={selectedWarehouse}
        onClose={() => {
          setIsDeleteRackOpen(false);
          setDeletingRack(null);
        }}
        onRackDeleted={async () => {
          if (selectedWarehouseId) {
            await fetchStorageHierarchy(selectedWarehouseId, selectedWarehouse);
          }
        }}
      />

      {/* Edit Bin Modal */}
      <EditBinModal
        isOpen={isEditBinOpen}
        bin={editingBin}
        warehouse={selectedWarehouse}
        onClose={() => {
          setIsEditBinOpen(false);
          setEditingBin(null);
        }}
        onBinUpdated={async () => {
          if (selectedWarehouseId) {
            await fetchStorageHierarchy(selectedWarehouseId, selectedWarehouse);
          }
        }}
      />

      {/* Delete Bin Modal */}
      <DeleteBinModal
        isOpen={isDeleteBinOpen}
        bin={deletingBin}
        onClose={() => {
          setIsDeleteBinOpen(false);
          setDeletingBin(null);
        }}
        onBinDeleted={async () => {
          if (selectedWarehouseId) {
            await fetchStorageHierarchy(selectedWarehouseId, selectedWarehouse);
          }
        }}
        onStockCleared={async () => {
          if (selectedWarehouseId) {
            await fetchStorageHierarchy(selectedWarehouseId, selectedWarehouse);
          }
        }}
      />
    </div>
  );
}

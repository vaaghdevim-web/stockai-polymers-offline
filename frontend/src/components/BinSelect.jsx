import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Layers,
  MapPin,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Search,
  Check,
  Grid3X3,
  ListFilter,
  Box
} from 'lucide-react';
import {
  getWarehouses,
  getWarehouseStorageHierarchy,
  getBinsByWarehouseId,
  flattenHierarchyBins,
  extractErrorMessage
} from '../services/domain/warehouseService';

/**
 * Reusable dynamic Warehouse & Bin selection and capacity visualizer component.
 * Features:
 * - Real-time occupancy breakdown (Current kg / Max Capacity kg / Available kg)
 * - Visual interactive Grid cards and Dropdown view modes
 * - Real-time incoming quantity storage fit calculation and projection
 * - Stable non-flickering async data fetching
 */
export default function BinSelect({
  warehouseId = null,
  selectedWarehouseId = null,
  value = '',
  onChange,
  onWarehouseChange,
  showWarehouseSelect = true,
  warehouseLabel = 'Target Warehouse',
  binLabel = 'Storage Bin Location',
  incomingQty = 0,
  required = true,
  disabled = false,
  filterType = null,
  error = null,
  style = {},
}) {
  const [warehouses, setWarehouses] = useState([]);
  const [activeWarehouseId, setActiveWarehouseId] = useState(warehouseId || selectedWarehouseId || '');
  const [bins, setBins] = useState([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [loadingBins, setLoadingBins] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  
  // UI Display Controls
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'dropdown'
  const [binSearch, setBinSearch] = useState('');
  const [filterAvailability, setFilterAvailability] = useState('ALL'); // 'ALL' | 'READY' | 'FULL'

  // Stable callback refs to avoid infinite re-render loops
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const onWarehouseChangeRef = useRef(onWarehouseChange);
  onWarehouseChangeRef.current = onWarehouseChange;

  const valueRef = useRef(value);
  valueRef.current = value;

  // Sync external warehouseId changes
  useEffect(() => {
    if (warehouseId) {
      setActiveWarehouseId(warehouseId);
    } else if (selectedWarehouseId !== null && selectedWarehouseId !== undefined && selectedWarehouseId !== '') {
      setActiveWarehouseId(selectedWarehouseId);
    }
  }, [warehouseId, selectedWarehouseId]);

  // Load warehouses from backend on mount or filterType change
  useEffect(() => {
    let isMounted = true;
    const loadWarehouses = async () => {
      try {
        setLoadingWarehouses(true);
        setFetchError(null);
        const params = filterType ? { type: filterType } : {};
        const res = await getWarehouses(params);
        if (!isMounted) return;

        const data = Array.isArray(res.data) ? res.data : [];
        const activeWarehouses = data.filter((w) => w.isActive !== false);
        setWarehouses(activeWarehouses);

        // Default to first warehouse if none active and not controlled externally
        if (activeWarehouses.length > 0) {
          setActiveWarehouseId((prev) => {
            if (!prev) {
              const firstId = activeWarehouses[0].warehouseId;
              if (onWarehouseChangeRef.current) {
                onWarehouseChangeRef.current(firstId, activeWarehouses[0]);
              }
              return firstId;
            }
            return prev;
          });
        }
      } catch (err) {
        if (isMounted) {
          setFetchError(extractErrorMessage(err, 'Failed to load warehouses'));
        }
      } finally {
        if (isMounted) setLoadingWarehouses(false);
      }
    };

    loadWarehouses();
    return () => {
      isMounted = false;
    };
  }, [filterType]);

  // Load bins and occupancy whenever activeWarehouseId changes
  useEffect(() => {
    let isMounted = true;
    if (!activeWarehouseId) {
      setBins([]);
      setLoadingBins(false);
      return;
    }

    const loadBins = async () => {
      try {
        setLoadingBins(true);
        setFetchError(null);
        let binList = [];

        try {
          // Primary: Load full storage hierarchy to get real occupancy and available capacity
          const treeRes = await getWarehouseStorageHierarchy(activeWarehouseId);
          binList = flattenHierarchyBins(treeRes.data);
        } catch {
          // Fallback: Query flat location bins
          const res = await getBinsByWarehouseId(activeWarehouseId);
          binList = Array.isArray(res.data) ? res.data : [];
        }

        if (!isMounted) return;

        // Filter active bins and standardize capacity numbers
        const activeBins = binList.filter((b) => b.isActive !== false).map((b) => {
          const capacityKg = (b.capacityKg !== undefined && b.capacityKg !== null && Number(b.capacityKg) > 0)
            ? Number(b.capacityKg)
            : 5000;
          const currentStockKg = Number(b.currentStockKg || 0);
          const availableCapacityKg = (b.availableCapacityKg !== undefined && b.availableCapacityKg !== null)
            ? Number(b.availableCapacityKg)
            : Math.max(0, capacityKg - currentStockKg);
          const utilizationPct = capacityKg > 0 ? (currentStockKg * 100) / capacityKg : 0;
          const isOverCapacity = currentStockKg >= capacityKg || availableCapacityKg <= 0;

          return {
            ...b,
            capacityKg,
            currentStockKg,
            availableCapacityKg,
            utilizationPct,
            isOverCapacity
          };
        });

        setBins(activeBins);

        // Auto-select first available bin if none is selected yet
        const currentVal = valueRef.current;
        if (!currentVal && activeBins.length > 0) {
          const firstAvail = activeBins.find(b => !b.isOverCapacity && b.availableCapacityKg > 0) || activeBins[0];
          if (firstAvail && onChangeRef.current) {
            onChangeRef.current(firstAvail.binId, firstAvail);
          }
        } else if (currentVal) {
          const selectedObj = activeBins.find((b) => String(b.binId) === String(currentVal));
          if (selectedObj && onChangeRef.current) {
            onChangeRef.current(selectedObj.binId, selectedObj);
          }
        }
      } catch (err) {
        if (isMounted) {
          setFetchError(extractErrorMessage(err, 'Failed to load warehouse storage bins'));
          setBins([]);
        }
      } finally {
        if (isMounted) setLoadingBins(false);
      }
    };

    loadBins();
    return () => {
      isMounted = false;
    };
  }, [activeWarehouseId]);

  const handleWarehouseSelect = (e) => {
    const nextId = e.target.value ? Number(e.target.value) : '';
    setActiveWarehouseId(nextId);
    const whObj = warehouses.find((w) => w.warehouseId === nextId) || null;
    if (onWarehouseChangeRef.current) {
      onWarehouseChangeRef.current(nextId, whObj);
    }
  };

  const handleBinSelect = (binObj) => {
    if (!binObj) {
      if (onChangeRef.current) onChangeRef.current('', null);
      return;
    }
    if (onChangeRef.current) {
      onChangeRef.current(binObj.binId, binObj);
    }
  };

  // Filter Bins for Visual Cards
  const filteredBins = bins.filter((b) => {
    // Search
    const q = binSearch.trim().toLowerCase();
    const matchesSearch = !q ||
      (b.binCode && b.binCode.toLowerCase().includes(q)) ||
      (b.rackCode && b.rackCode.toLowerCase().includes(q)) ||
      (b.shelfCode && b.shelfCode.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    // Availability tab
    if (filterAvailability === 'READY') {
      return !b.isOverCapacity && b.availableCapacityKg > 0;
    }
    if (filterAvailability === 'FULL') {
      return b.isOverCapacity || b.utilizationPct >= 80;
    }
    return true;
  });

  const selectedBin = bins.find((b) => String(b.binId) === String(value)) || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', ...style }}>
      {fetchError && (
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-coral)',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} />
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveWarehouseId((prev) => prev);
            }}
            className="btn btn-ghost btn-xs"
            title="Retry loading"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      )}

      {/* Warehouse Selector Row */}
      {showWarehouseSelect && !warehouseId && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label
              style={{
                fontSize: '11px',
                fontWeight: '700',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-mono)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <MapPin size={13} color="#0284C7" /> {warehouseLabel}
            </label>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {warehouses.length} Active Storage Facilities
            </span>
          </div>
          <select
            className="select"
            value={activeWarehouseId}
            onChange={handleWarehouseSelect}
            disabled={disabled || loadingWarehouses}
            required={required}
            style={{ fontSize: '13px', fontWeight: '500' }}
          >
            {loadingWarehouses ? (
              <option value="">Loading warehouses...</option>
            ) : warehouses.length === 0 ? (
              <option value="">No warehouses found</option>
            ) : (
              warehouses.map((w) => (
                <option key={w.warehouseId} value={w.warehouseId}>
                  {w.warehouseName} ({w.type || 'Standard Storage'})
                </option>
              ))
            )}
          </select>
        </div>
      )}

      {/* Bin Selection Header & View Mode Switcher */}
      <div style={{ marginTop: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label
            style={{
              fontSize: '11px',
              fontWeight: '700',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-mono)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Layers size={13} color="#0284C7" /> {binLabel}
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Filter buttons */}
            <div style={{ display: 'flex', background: '#F1F5F9', padding: '2px', borderRadius: '4px' }}>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: viewMode === 'grid' ? '700' : '500',
                  border: 'none',
                  borderRadius: '3px',
                  background: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
                  color: viewMode === 'grid' ? '#0284C7' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Grid3X3 size={11} /> Visual Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('dropdown')}
                style={{
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: viewMode === 'dropdown' ? '700' : '500',
                  border: 'none',
                  borderRadius: '3px',
                  background: viewMode === 'dropdown' ? '#FFFFFF' : 'transparent',
                  color: viewMode === 'dropdown' ? '#0284C7' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'dropdown' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <ListFilter size={11} /> Dropdown
              </button>
            </div>
          </div>
        </div>

        {/* MODE 1: VISUAL INTERACTIVE GRID OF BINS & CAPACITY */}
        {viewMode === 'grid' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Search & Filter Chips Bar */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
                <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '9px' }} />
                <input
                  type="text"
                  placeholder="Filter bins by code, rack, shelf..."
                  value={binSearch}
                  onChange={(e) => setBinSearch(e.target.value)}
                  className="input"
                  style={{ paddingLeft: '26px', fontSize: '11.5px', padding: '5px 8px 5px 26px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '4px' }}>
                {[
                  { id: 'ALL', label: `All (${bins.length})` },
                  { id: 'READY', label: `Available (${bins.filter(b => !b.isOverCapacity && b.availableCapacityKg > 0).length})` },
                  { id: 'FULL', label: `Full/Over (${bins.filter(b => b.isOverCapacity || b.utilizationPct >= 80).length})` }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilterAvailability(f.id)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: filterAvailability === f.id ? '700' : '500',
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: filterAvailability === f.id ? '#0284C7' : 'var(--border-default)',
                      background: filterAvailability === f.id ? '#F0F9FF' : '#FFFFFF',
                      color: filterAvailability === f.id ? '#0284C7' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Bins Grid */}
            <div
              style={{
                maxHeight: '220px',
                overflowY: 'auto',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                padding: '8px',
                background: '#F8FAFC',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                gap: '8px'
              }}
            >
              {loadingBins ? (
                <div style={{ gridColumn: '1 / -1', padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  <RefreshCw size={16} className="animate-spin" style={{ margin: '0 auto 6px auto', color: '#0284C7' }} />
                  Loading warehouse storage bins & real occupancy...
                </div>
              ) : filteredBins.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No storage bins match the current filter in this warehouse.
                </div>
              ) : (
                filteredBins.map((b) => {
                  const isSelected = String(b.binId) === String(value);
                  const isFull = b.isOverCapacity || b.availableCapacityKg <= 0;
                  const willFit = incomingQty > 0 ? (incomingQty <= b.availableCapacityKg) : true;
                  const willOverflow = incomingQty > 0 && (incomingQty > b.availableCapacityKg);
                  const projectedStock = b.currentStockKg + (incomingQty > 0 ? incomingQty : 0);
                  const projectedPct = b.capacityKg > 0 ? Math.min(100, (projectedStock * 100) / b.capacityKg) : 0;

                  return (
                    <div
                      key={b.binId}
                      onClick={() => handleBinSelect(b)}
                      style={{
                        padding: '10px 12px',
                        background: '#FFFFFF',
                        border: '1.5px solid',
                        borderColor: isSelected ? '#0284C7' : isFull ? '#FECACA' : 'var(--border-default)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        boxShadow: isSelected ? '0 0 0 2px rgba(2, 132, 199, 0.2)' : '0 1px 2px rgba(0,0,0,0.03)',
                        transition: 'all 0.12s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.borderColor = '#0284C7';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.borderColor = isFull ? '#FECACA' : 'var(--border-default)';
                      }}
                    >
                      {/* Top Code & Status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div className="font-mono" style={{ fontSize: '12.5px', fontWeight: '800', color: isSelected ? '#0284C7' : 'var(--text-primary)' }}>
                            {b.binCode}
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                            Rack: {b.rackCode || 'R-01'} · Shelf: {b.shelfCode || 'S-01'}
                          </div>
                        </div>

                        {isSelected ? (
                          <span style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: '#0284C7',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Check size={11} strokeWidth={3} />
                          </span>
                        ) : isFull ? (
                          <span className="badge badge-coral" style={{ fontSize: '9.5px', padding: '1px 5px' }}>
                            FULL
                          </span>
                        ) : (
                          <span className="badge badge-emerald" style={{ fontSize: '9.5px', padding: '1px 5px' }}>
                            READY
                          </span>
                        )}
                      </div>

                      {/* Capacity Progress Bar */}
                      <div style={{ marginTop: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', marginBottom: '3px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Occupied:</span>
                          <span className="font-mono" style={{ fontWeight: '700', color: isFull ? '#EF4444' : 'var(--text-primary)' }}>
                            {b.currentStockKg.toLocaleString()} / {b.capacityKg.toLocaleString()} kg ({Math.round(b.utilizationPct)}%)
                          </span>
                        </div>

                        <div style={{
                          height: '6px',
                          background: '#E2E8F0',
                          borderRadius: '3px',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, b.utilizationPct)}%`,
                            background: b.utilizationPct >= 90 ? '#EF4444' : b.utilizationPct >= 65 ? '#F59E0B' : '#10B981',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>

                      {/* Real-time Storage Fit & Available Space */}
                      <div style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Available:</span>
                        <strong className="font-mono" style={{ color: isFull ? '#EF4444' : '#047857' }}>
                          {b.availableCapacityKg.toLocaleString()} kg free
                        </strong>
                      </div>

                      {/* Real-Time Projection if user entered quantity */}
                      {incomingQty > 0 && (
                        <div style={{
                          fontSize: '10px',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          background: willOverflow ? '#FEF2F2' : '#F0F9FF',
                          border: `1px solid ${willOverflow ? '#FECACA' : '#BAE6FD'}`,
                          color: willOverflow ? '#B91C1C' : '#0369A1',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: '600'
                        }}>
                          {willOverflow ? (
                            <>
                              <AlertTriangle size={11} color="#EF4444" />
                              <span>Exceeds by {(incomingQty - b.availableCapacityKg).toLocaleString()} kg</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={11} color="#0284C7" />
                              <span>+ {incomingQty.toLocaleString()} kg → {Math.round(projectedPct)}% after inward</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* MODE 2: CLASSIC COMPACT DROPDOWN SELECT */}
        {viewMode === 'dropdown' && (
          <select
            className="select font-mono"
            value={value || ''}
            onChange={(e) => {
              const binObj = bins.find((b) => String(b.binId) === String(e.target.value)) || null;
              handleBinSelect(binObj);
            }}
            disabled={disabled || loadingBins || bins.length === 0}
            required={required}
            style={{ fontSize: '13px' }}
          >
            {loadingBins ? (
              <option value="">Loading storage bins...</option>
            ) : bins.length === 0 ? (
              <option value="">(No storage bins in warehouse)</option>
            ) : (
              <>
                <option value="">-- Select Storage Bin --</option>
                {bins.map((b) => {
                  const isFull = b.isOverCapacity || b.availableCapacityKg <= 0;
                  const capText = ` [Occupied: ${b.currentStockKg.toLocaleString()} / ${b.capacityKg.toLocaleString()} kg — Avail: ${b.availableCapacityKg.toLocaleString()} kg]${isFull ? ' (FULL)' : ''}`;
                  return (
                    <option key={b.binId} value={b.binId}>
                      {b.binCode} (Rack: {b.rackCode || 'N/A'}, Shelf: {b.shelfCode || 'N/A'}) {capText}
                    </option>
                  );
                })}
              </>
            )}
          </select>
        )}
      </div>

      {/* Selected Storage Bin Detail Summary Banner */}
      {selectedBin && (
        <div
          style={{
            padding: '10px 14px',
            background: selectedBin.isOverCapacity ? '#FEF2F2' : '#F0F9FF',
            border: `1.5px solid ${selectedBin.isOverCapacity ? '#FECACA' : '#BAE6FD'}`,
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Box size={16} color="#0284C7" />
              <span style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Selected: <span className="font-mono" style={{ color: '#0284C7' }}>{selectedBin.binCode}</span>
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                ({selectedBin.rackCode || 'Rack R-01'} / {selectedBin.shelfCode || 'Shelf S-01'})
              </span>
            </div>

            {selectedBin.isOverCapacity ? (
              <span className="badge badge-coral">OVER CAPACITY / FULL</span>
            ) : (
              <span className="badge badge-emerald">READY TO STORE</span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', fontSize: '11.5px', marginTop: '2px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Total Capacity:</span>
              <div className="font-mono" style={{ fontWeight: '700' }}>{selectedBin.capacityKg.toLocaleString()} kg</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Currently Stored:</span>
              <div className="font-mono" style={{ fontWeight: '700', color: selectedBin.isOverCapacity ? '#EF4444' : 'var(--text-primary)' }}>
                {selectedBin.currentStockKg.toLocaleString()} kg
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Available Space:</span>
              <div className="font-mono" style={{ fontWeight: '800', color: selectedBin.isOverCapacity ? '#EF4444' : '#047857' }}>
                {selectedBin.availableCapacityKg.toLocaleString()} kg
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Current Fill:</span>
              <div className="font-mono" style={{ fontWeight: '700' }}>
                {Math.round(selectedBin.utilizationPct)}%
              </div>
            </div>
          </div>

          {/* Real-time warning or confirmation message */}
          {incomingQty > 0 && (
            <div style={{
              fontSize: '11px',
              borderTop: '1px dashed #CBD5E1',
              paddingTop: '6px',
              color: incomingQty > selectedBin.availableCapacityKg ? '#B91C1C' : '#0369A1',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {incomingQty > selectedBin.availableCapacityKg ? (
                <>
                  <AlertTriangle size={13} color="#EF4444" />
                  <span>Warning: Receiving {incomingQty.toLocaleString()} kg will exceed this bin's available capacity by {(incomingQty - selectedBin.availableCapacityKg).toLocaleString()} kg. Please choose a bin with more space.</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={13} color="#10B981" />
                  <span>Ready: Receiving {incomingQty.toLocaleString()} kg will increase bin utilization to {Math.round(Math.min(100, ((selectedBin.currentStockKg + incomingQty) * 100) / selectedBin.capacityKg))}% ({ (selectedBin.currentStockKg + incomingQty).toLocaleString() } / { selectedBin.capacityKg.toLocaleString() } kg).</span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <span style={{ fontSize: '11px', color: 'var(--accent-coral)', marginTop: '2px' }}>
          {error}
        </span>
      )}
    </div>
  );
}

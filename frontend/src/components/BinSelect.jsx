import React, { useState, useEffect, useCallback } from 'react';
import { Layers, MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import {
  getWarehouses,
  getWarehouseStorageHierarchy,
  getBinsByWarehouseId,
  flattenHierarchyBins,
  extractErrorMessage
} from '../services/domain/warehouseService';

/**
 * Reusable dynamic Warehouse & Bin selection component.
 * Backed by Spring Boot WarehouseController endpoints:
 * - GET /api/v1/warehouses
 * - GET /api/v1/warehouses/{id}/storage-tree (occupancy & availability)
 * - GET /api/v1/warehouses/{id}/bins (fallback)
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

  // Sync external warehouseId changes
  useEffect(() => {
    if (warehouseId) {
      setActiveWarehouseId(warehouseId);
    } else if (selectedWarehouseId !== null && selectedWarehouseId !== undefined) {
      setActiveWarehouseId(selectedWarehouseId);
    }
  }, [warehouseId, selectedWarehouseId]);

  // Load warehouses from backend on mount or filterType change
  const loadWarehouses = useCallback(async () => {
    try {
      setLoadingWarehouses(true);
      setFetchError(null);
      const params = filterType ? { type: filterType } : {};
      const res = await getWarehouses(params);
      const data = Array.isArray(res.data) ? res.data : [];
      const activeWarehouses = data.filter((w) => w.isActive !== false);
      setWarehouses(activeWarehouses);

      // Default to first warehouse if none active and not controlled externally
      setActiveWarehouseId((prev) => {
        if (!prev && activeWarehouses.length > 0 && !warehouseId) {
          const firstId = activeWarehouses[0].warehouseId;
          if (onWarehouseChange) {
            onWarehouseChange(firstId, activeWarehouses[0]);
          }
          return firstId;
        }
        return prev;
      });
    } catch (err) {
      setFetchError(extractErrorMessage(err, 'Failed to load warehouses'));
    } finally {
      setLoadingWarehouses(false);
    }
  }, [filterType, warehouseId, onWarehouseChange]);

  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  // Load bins and occupancy whenever activeWarehouseId changes
  const loadBins = useCallback(async (whId) => {
    if (!whId) {
      setBins([]);
      return;
    }
    try {
      setLoadingBins(true);
      setFetchError(null);
      let binList = [];

      try {
        // Primary: Load full storage hierarchy to get real occupancy and available capacity
        const treeRes = await getWarehouseStorageHierarchy(whId);
        binList = flattenHierarchyBins(treeRes.data);
      } catch {
        // Fallback: Query flat location bins
        const res = await getBinsByWarehouseId(whId);
        binList = Array.isArray(res.data) ? res.data : [];
      }

      // Filter active bins
      const activeBins = binList.filter((b) => b.isActive !== false);
      setBins(activeBins);

      // Changing warehouse clears an invalid previously selected bin
      if (value) {
        const valueExists = activeBins.some((b) => String(b.binId) === String(value));
        if (!valueExists && onChange) {
          onChange('', null);
        }
      }
    } catch (err) {
      setFetchError(extractErrorMessage(err, 'Failed to load warehouse bins'));
      setBins([]);
    } finally {
      setLoadingBins(false);
    }
  }, [value, onChange]);

  useEffect(() => {
    if (activeWarehouseId) {
      loadBins(activeWarehouseId);
    } else {
      setBins([]);
    }
  }, [activeWarehouseId, loadBins]);

  const handleWarehouseSelect = (e) => {
    const nextId = e.target.value ? Number(e.target.value) : '';
    setActiveWarehouseId(nextId);
    const whObj = warehouses.find((w) => w.warehouseId === nextId) || null;
    if (onWarehouseChange) {
      onWarehouseChange(nextId, whObj);
    }
    if (onChange) {
      onChange('', null);
    }
  };

  const handleBinSelect = (e) => {
    const nextBinId = e.target.value ? Number(e.target.value) : '';
    const binObj = bins.find((b) => b.binId === nextBinId) || null;
    if (onChange) {
      onChange(nextBinId, binObj);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', ...style }}>
      {fetchError && (
        <div
          style={{
            padding: '6px 10px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-xs)',
            color: 'var(--accent-coral)',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={13} />
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              loadWarehouses();
              if (activeWarehouseId) loadBins(activeWarehouseId);
            }}
            className="btn btn-ghost btn-xs"
            title="Retry loading"
          >
            <RefreshCw size={11} />
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: showWarehouseSelect && !warehouseId ? '1fr 1fr' : '1fr', gap: '10px' }}>
        {showWarehouseSelect && !warehouseId && (
          <div>
            <label
              style={{
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--text-muted)',
                display: 'block',
                marginBottom: '4px',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} color="var(--accent-cyan)" /> {warehouseLabel}
              </span>
            </label>
            <select
              className="select"
              value={activeWarehouseId}
              onChange={handleWarehouseSelect}
              disabled={disabled || loadingWarehouses}
              required={required}
            >
              {loadingWarehouses ? (
                <option value="">Loading warehouses...</option>
              ) : warehouses.length === 0 ? (
                <option value="">No warehouses found</option>
              ) : (
                warehouses.map((w) => (
                  <option key={w.warehouseId} value={w.warehouseId}>
                    {w.warehouseName} ({w.type || 'Standard'})
                  </option>
                ))
              )}
            </select>
          </div>
        )}

        <div>
          <label
            style={{
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: '4px',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Layers size={12} color="var(--accent-cyan)" /> {binLabel}
            </span>
          </label>
          <select
            className="select font-mono"
            value={value || ''}
            onChange={handleBinSelect}
            disabled={disabled || loadingBins || bins.length === 0}
            required={required}
          >
            {loadingBins ? (
              <option value="">Loading storage bins...</option>
            ) : bins.length === 0 ? (
              <option value="">(No storage bins in warehouse)</option>
            ) : (
              <>
                <option value="">-- Select Storage Bin --</option>
                {bins.map((b) => {
                  let capText = '';
                  if (b.availableCapacityKg !== undefined && b.availableCapacityKg !== null) {
                    if (b.isOverCapacity) {
                      capText = ` — Avail: 0 / ${Number(b.capacityKg).toLocaleString()} kg [FULL/OVER]`;
                    } else {
                      capText = ` — Avail: ${Number(b.availableCapacityKg).toLocaleString()} / ${Number(b.capacityKg).toLocaleString()} kg`;
                    }
                  } else if (b.capacityKg) {
                    capText = ` — Cap: ${Number(b.capacityKg).toLocaleString()} kg`;
                  }
                  return (
                    <option key={b.binId} value={b.binId}>
                      {b.binCode} [Rack: {b.rackCode || 'N/A'}, Shelf: {b.shelfCode || 'N/A'}]{capText}
                    </option>
                  );
                })}
              </>
            )}
          </select>
        </div>
      </div>

      {error && (
        <span style={{ fontSize: '11px', color: 'var(--accent-coral)', marginTop: '2px' }}>
          {error}
        </span>
      )}
    </div>
  );
}

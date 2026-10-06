import api, { warehouseApi } from '../api';

/**
 * Domain Service for Warehouses, Storage Topology, Racks, Shelves, Bins, and Capacity Occupancy.
 * Backed by Spring Boot WarehouseController and WarehouseLayoutService.
 */

export const extractErrorMessage = (error, fallback = 'Operation failed.') => {
  if (!error) return fallback;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.data?.details && Array.isArray(error.response.data.details)) {
    return error.response.data.details.join('; ');
  }
  if (typeof error.response?.data === 'string') return error.response.data;
  return error.message || fallback;
};

/**
 * Retrieves all registered warehouses (supports optional plantId or type query params).
 * Endpoint: GET /api/v1/warehouses
 */
export const getWarehouses = async (params) => {
  return warehouseApi.getWarehouses(params);
};

/**
 * Retrieves a single warehouse by ID.
 * Endpoint: GET /api/v1/warehouses/{id}
 */
export const getWarehouseById = async (id) => {
  return warehouseApi.getWarehouseById(id);
};

/**
 * Builds a structured Warehouse -> Rack -> Shelf -> Bin hierarchy tree
 * from real backend LocationBinResponse records.
 */
export const buildHierarchyFromBins = (warehouse, bins = []) => {
  const safeBins = Array.isArray(bins) ? bins : [];
  const warehouseId = warehouse?.warehouseId || (safeBins[0]?.warehouseId ?? null);
  const warehouseName = warehouse?.warehouseName || (safeBins[0]?.warehouseName ?? 'Warehouse');

  const rackMap = new Map();

  safeBins.forEach((b) => {
    const rackCode = b.rackCode || 'UNASSIGNED-RACK';
    if (!rackMap.has(rackCode)) {
      rackMap.set(rackCode, {
        rackId: rackCode,
        rackCode: rackCode,
        shelfMap: new Map(),
      });
    }
    const rack = rackMap.get(rackCode);

    const shelfKey = b.shelfId ? String(b.shelfId) : (b.shelfCode || 'UNASSIGNED-SHELF');
    if (!rack.shelfMap.has(shelfKey)) {
      let level = 1;
      if (b.shelfCode) {
        const match = b.shelfCode.match(/(\d+)$/);
        if (match) level = parseInt(match[1], 10);
      } else if (b.shelfId) {
        level = Number(b.shelfId);
      }
      rack.shelfMap.set(shelfKey, {
        shelfId: b.shelfId || shelfKey,
        shelfCode: b.shelfCode || shelfKey,
        shelfLevel: level,
        bins: [],
      });
    }
    const shelf = rack.shelfMap.get(shelfKey);

    const cap = (b.capacityKg !== null && b.capacityKg !== undefined && Number(b.capacityKg) > 0)
      ? Number(b.capacityKg)
      : 5000;
    const stock = Number(b.currentStockKg || 0);
    const avail = (b.availableCapacityKg !== undefined && b.availableCapacityKg !== null)
      ? Number(b.availableCapacityKg)
      : Math.max(0, cap - stock);
    const util = (b.utilizationPct !== undefined && b.utilizationPct !== null)
      ? Number(b.utilizationPct)
      : (cap > 0 ? (stock * 100) / cap : 0);

    shelf.bins.push({
      binId: b.binId,
      binCode: b.binCode,
      isActive: b.isActive ?? true,
      rackCode: rackCode,
      shelfId: b.shelfId,
      shelfCode: b.shelfCode,
      warehouseId: warehouseId,
      warehouseName: warehouseName,
      capacityKg: cap,
      currentStockKg: stock,
      availableCapacityKg: avail,
      utilizationPct: util,
      isOverCapacity: stock > cap,
      activePalletCount: Number(b.activePalletCount || 0),
    });
  });

  let totalShelvesCount = 0;
  const racks = Array.from(rackMap.values()).map((rack) => {
    const shelves = Array.from(rack.shelfMap.values()).map((shelf) => {
      const shelfCap = shelf.bins.reduce((sum, bin) => sum + (bin.capacityKg || 0), 0);
      const shelfStock = shelf.bins.reduce((sum, bin) => sum + (bin.currentStockKg || 0), 0);
      const shelfAvail = shelf.bins.reduce((sum, bin) => sum + (bin.availableCapacityKg || 0), 0);
      const shelfUtil = shelfCap > 0 ? (shelfStock * 100) / shelfCap : 0;
      return {
        shelfId: shelf.shelfId,
        shelfCode: shelf.shelfCode,
        shelfLevel: shelf.shelfLevel,
        bins: shelf.bins,
        totalBins: shelf.bins.length,
        totalCapacityKg: shelfCap,
        totalCurrentStockKg: shelfStock,
        totalAvailableCapacityKg: shelfAvail,
        utilizationPct: shelfUtil,
      };
    });

    totalShelvesCount += shelves.length;
    const rackCap = shelves.reduce((sum, s) => sum + s.totalCapacityKg, 0);
    const rackStock = shelves.reduce((sum, s) => sum + s.totalCurrentStockKg, 0);
    const rackAvail = shelves.reduce((sum, s) => sum + s.totalAvailableCapacityKg, 0);
    const rackUtil = rackCap > 0 ? (rackStock * 100) / rackCap : 0;

    return {
      rackId: rack.rackId,
      rackCode: rack.rackCode,
      shelves: shelves,
      totalShelves: shelves.length,
      totalBins: shelves.reduce((sum, s) => sum + s.totalBins, 0),
      totalCapacityKg: rackCap,
      totalCurrentStockKg: rackStock,
      totalAvailableCapacityKg: rackAvail,
      utilizationPct: rackUtil,
    };
  });

  const totalCapacityKg = racks.reduce((sum, r) => sum + r.totalCapacityKg, 0);
  const totalCurrentStockKg = racks.reduce((sum, r) => sum + r.totalCurrentStockKg, 0);
  const totalAvailableCapacityKg = racks.reduce((sum, r) => sum + r.totalAvailableCapacityKg, 0);
  const overallUtilizationPct = totalCapacityKg > 0 ? (totalCurrentStockKg * 100) / totalCapacityKg : 0;

  return {
    warehouseId,
    warehouseName,
    racks,
    totalRacks: racks.length,
    totalShelves: totalShelvesCount,
    totalBins: safeBins.length,
    totalCapacityKg,
    totalCurrentStockKg,
    totalAvailableCapacityKg,
    overallUtilizationPct,
  };
};

/**
 * Enriches a storage tree with capacity and utilization statistics.
 */
export const enrichStorageTree = (tree, warehouse = null) => {
  if (!tree) return null;
  const warehouseId = tree.warehouseId || warehouse?.warehouseId;
  const warehouseName = tree.warehouseName || warehouse?.warehouseName;

  let totalWarehouseCap = 0;
  let totalWarehouseStock = 0;
  let totalWarehouseAvail = 0;
  let totalWarehouseBins = 0;
  let totalWarehouseShelves = 0;

  const racks = (tree.racks || []).map((rack) => {
    let rackCap = 0;
    let rackStock = 0;
    let rackAvail = 0;
    let rackBinsCount = 0;

    const shelves = (rack.shelves || []).map((shelf) => {
      let shelfCap = 0;
      let shelfStock = 0;
      let shelfAvail = 0;

      const bins = (shelf.bins || []).map((bin) => {
        const cap = (bin.capacityKg !== null && bin.capacityKg !== undefined && Number(bin.capacityKg) > 0)
          ? Number(bin.capacityKg)
          : 5000;
        const stock = Number(bin.currentStockKg || 0);
        const avail = (bin.availableCapacityKg !== undefined && bin.availableCapacityKg !== null)
          ? Number(bin.availableCapacityKg)
          : Math.max(0, cap - stock);
        const util = (bin.utilizationPct !== undefined && bin.utilizationPct !== null)
          ? Number(bin.utilizationPct)
          : (cap > 0 ? (stock * 100) / cap : 0);
        const palletCount = Number(bin.activePalletCount || 0);

        shelfCap += cap;
        shelfStock += stock;
        shelfAvail += avail;

        return {
          ...bin,
          rackId: rack.rackId,
          rackCode: rack.rackCode,
          shelfId: shelf.shelfId,
          shelfCode: shelf.shelfCode,
          shelfLevel: shelf.shelfLevel,
          warehouseId,
          warehouseName,
          capacityKg: cap,
          currentStockKg: stock,
          availableCapacityKg: avail,
          utilizationPct: util,
          isOverCapacity: stock > cap,
          activePalletCount: palletCount,
        };
      });

      rackCap += shelfCap;
      rackStock += shelfStock;
      rackAvail += shelfAvail;
      rackBinsCount += bins.length;

      const shelfUtil = shelfCap > 0 ? (shelfStock * 100) / shelfCap : 0;

      return {
        ...shelf,
        rackId: rack.rackId,
        rackCode: rack.rackCode,
        bins,
        totalBins: bins.length,
        totalCapacityKg: shelfCap,
        totalCurrentStockKg: shelfStock,
        totalAvailableCapacityKg: shelfAvail,
        utilizationPct: shelfUtil,
      };
    });

    totalWarehouseCap += rackCap;
    totalWarehouseStock += rackStock;
    totalWarehouseAvail += rackAvail;
    totalWarehouseBins += rackBinsCount;
    totalWarehouseShelves += shelves.length;

    const rackUtil = rackCap > 0 ? (rackStock * 100) / rackCap : 0;

    return {
      ...rack,
      shelves,
      totalShelves: shelves.length,
      totalBins: rackBinsCount,
      totalCapacityKg: rackCap,
      totalCurrentStockKg: rackStock,
      totalAvailableCapacityKg: rackAvail,
      utilizationPct: rackUtil,
    };
  });

  const overallUtil = totalWarehouseCap > 0 ? (totalWarehouseStock * 100) / totalWarehouseCap : 0;

  return {
    ...tree,
    warehouseId,
    warehouseName,
    racks,
    totalRacks: racks.length,
    totalShelves: totalWarehouseShelves,
    totalBins: totalWarehouseBins,
    totalCapacityKg: totalWarehouseCap,
    totalCurrentStockKg: totalWarehouseStock,
    totalAvailableCapacityKg: totalWarehouseAvail,
    overallUtilizationPct: overallUtil,
  };
};

/**
 * Retrieves the full storage tree hierarchy (Warehouse -> Racks -> Shelves -> Bins)
 * backed by verified backend endpoint GET /api/v1/warehouses/{warehouseId}/storage-tree
 * with fallback to GET /api/v1/warehouses/{warehouseId}/bins.
 */
export const getWarehouseStorageHierarchy = async (warehouseId, warehouse = null) => {
  try {
    const res = await warehouseApi.getStorageTree(warehouseId);
    if (res.data && res.data.warehouseId) {
      const enriched = enrichStorageTree(res.data, warehouse);
      const rawBins = flattenHierarchyBins(enriched);
      return {
        data: enriched,
        rawBins: rawBins,
      };
    }
  } catch (err) {
    console.warn('Storage tree endpoint error, falling back to bin list:', err);
  }
  const res = await warehouseApi.getBinsByWarehouseId(warehouseId);
  const bins = Array.isArray(res.data) ? res.data : [];
  const tree = buildHierarchyFromBins(warehouse, bins);
  return {
    data: tree,
    rawBins: bins,
  };
};

/**
 * Retrieves flat list of location bins for a warehouse.
 * Endpoint: GET /api/v1/warehouses/{warehouseId}/bins
 */
export const getBinsByWarehouseId = async (warehouseId) => {
  return warehouseApi.getBinsByWarehouseId(warehouseId);
};

/**
 * Retrieves real-time occupancy statistics for a specific storage bin.
 */
export const getBinOccupancy = async (binId) => {
  try {
    return await api.get(`/warehouses/bins/${binId}/occupancy`);
  } catch {
    return { data: null };
  }
};

/**
 * Creates a new warehouse.
 * Endpoint: POST /api/v1/warehouses
 */
export const createWarehouse = async (data) => {
  return warehouseApi.createWarehouse(data);
};

/**
 * Retrieves all registered plants.
 * Endpoint: GET /api/v1/warehouses/plants
 */
export const getPlants = async () => {
  return warehouseApi.getPlants();
};

/**
 * Retrieves all racks for a warehouse.
 * Endpoint: GET /api/v1/warehouses/{id}/racks
 */
export const getRacksByWarehouseId = async (warehouseId) => {
  return warehouseApi.getRacksByWarehouseId(warehouseId);
};

/**
 * Creates a new rack under a warehouse.
 * Endpoint: POST /api/v1/warehouses/{id}/racks
 */
export const createRack = async (warehouseId, data) => {
  return warehouseApi.createRack(warehouseId, data);
};

/**
 * Retrieves all shelves for a rack.
 * Endpoint: GET /api/v1/warehouses/racks/{rackId}/shelves
 */
export const getShelvesByRackId = async (rackId) => {
  return warehouseApi.getShelvesByRackId(rackId);
};

/**
 * Creates a new shelf under a rack.
 * Endpoint: POST /api/v1/warehouses/racks/{rackId}/shelves
 */
export const createShelf = async (rackId, data) => {
  return warehouseApi.createShelf(rackId, data);
};

/**
 * Creates a new bin under a shelf.
 * Endpoint: POST /api/v1/warehouses/shelves/{shelfId}/bins
 */
export const createBin = async (shelfId, data) => {
  return warehouseApi.createBin(shelfId, data);
};

/**
 * Updates an existing rack.
 * Endpoint: PUT /api/v1/warehouses/racks/{rackId}
 */
export const updateRack = async (rackId, data) => {
  return warehouseApi.updateRack(rackId, data);
};

/**
 * Deletes an existing rack (and child shelves/bins if empty).
 * Endpoint: DELETE /api/v1/warehouses/racks/{rackId}
 */
export const deleteRack = async (rackId) => {
  return warehouseApi.deleteRack(rackId);
};

/**
 * Updates an existing shelf.
 * Endpoint: PUT /api/v1/warehouses/shelves/{shelfId}
 */
export const updateShelf = async (shelfId, data) => {
  return warehouseApi.updateShelf(shelfId, data);
};

/**
 * Deletes an existing shelf.
 * Endpoint: DELETE /api/v1/warehouses/shelves/{shelfId}
 */
export const deleteShelf = async (shelfId) => {
  return warehouseApi.deleteShelf(shelfId);
};

/**
 * Updates an existing bin (binCode, capacityKg, isActive).
 * Endpoint: PUT /api/v1/warehouses/bins/{binId}
 */
export const updateBin = async (binId, data) => {
  return warehouseApi.updateBin(binId, data);
};

/**
 * Deletes an existing bin.
 * Endpoint: DELETE /api/v1/warehouses/bins/{binId}?force={force}
 */
export const deleteBin = async (binId, force = false) => {
  return warehouseApi.deleteBin(binId, force);
};

/**
 * Clears all active stock & pallets from a specific bin.
 * Endpoint: POST /api/v1/warehouses/bins/{binId}/clear-stock
 */
export const clearBinStock = async (binId) => {
  return warehouseApi.clearBinStock(binId);
};

/**
 * Clears all active stock & pallets across all bins in a warehouse.
 * Endpoint: POST /api/v1/warehouses/{warehouseId}/clear-all-stock
 */
export const clearAllWarehouseStock = async (warehouseId) => {
  return warehouseApi.clearAllWarehouseStock(warehouseId);
};

/**
 * Flattens the nested racks -> shelves -> bins hierarchy into a list of enriched bin objects.
 */
export const flattenHierarchyBins = (tree) => {
  if (!tree || !Array.isArray(tree.racks)) return [];
  const bins = [];
  tree.racks.forEach((rack) => {
    if (Array.isArray(rack.shelves)) {
      rack.shelves.forEach((shelf) => {
        if (Array.isArray(shelf.bins)) {
          shelf.bins.forEach((bin) => {
            bins.push({
              ...bin,
              rackId: rack.rackId,
              rackCode: rack.rackCode,
              shelfId: shelf.shelfId,
              shelfCode: shelf.shelfCode,
              shelfLevel: shelf.shelfLevel,
              warehouseId: tree.warehouseId,
              warehouseName: tree.warehouseName,
            });
          });
        }
      });
    }
  });
  return bins;
};

export default {
  getWarehouses,
  getWarehouseById,
  getWarehouseStorageHierarchy,
  enrichStorageTree,
  getBinsByWarehouseId,
  getBinOccupancy,
  createWarehouse,
  getPlants,
  getRacksByWarehouseId,
  createRack,
  updateRack,
  deleteRack,
  getShelvesByRackId,
  createShelf,
  updateShelf,
  deleteShelf,
  createBin,
  updateBin,
  deleteBin,
  clearBinStock,
  clearAllWarehouseStock,
  flattenHierarchyBins,
  buildHierarchyFromBins,
  extractErrorMessage,
};

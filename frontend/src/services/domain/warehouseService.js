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
 * Retrieves the full storage tree hierarchy (Warehouse -> Racks -> Shelves -> Bins)
 * including aggregated capacity, current stock, available capacity, and utilization percentage.
 * Endpoint: GET /api/v1/warehouses/{warehouseId}/storage-tree
 */
export const getWarehouseStorageHierarchy = async (warehouseId) => {
  return api.get(`/warehouses/${warehouseId}/storage-tree`);
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
 * Endpoint: GET /api/v1/warehouses/bins/{binId}/occupancy
 */
export const getBinOccupancy = async (binId) => {
  return api.get(`/warehouses/bins/${binId}/occupancy`);
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
  getBinsByWarehouseId,
  getBinOccupancy,
  flattenHierarchyBins,
  extractErrorMessage,
};

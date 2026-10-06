import { inventoryApi, procurementApi } from '../api';

/**
 * Domain Service for Raw Materials, Silos, FIFO Batch Tracking & Inward Goods Receipt (GRN).
 * Backed by Spring Boot RawMaterialInventoryController & ReorderAlertController.
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
 * Retrieves the complete raw material catalog with current inventory totals.
 * Endpoint: GET /api/v1/inventory/raw-materials
 */
export const getRawMaterials = async () => {
  return inventoryApi.getRawMaterials();
};

/**
 * Creates/defines a brand new raw material SKU.
 * Endpoint: POST /api/v1/inventory/raw-materials/definitions
 */
export const createRawMaterial = async (payload) => {
  return inventoryApi.createRawMaterial(payload);
};

/**
 * Retrieves material categories.
 * Endpoint: GET /api/v1/inventory/raw-materials/categories
 */
export const getMaterialCategories = async () => {
  return inventoryApi.getMaterialCategories();
};

/**
 * Retrieves units of measure.
 * Endpoint: GET /api/v1/inventory/raw-materials/uoms
 */
export const getMaterialUoms = async () => {
  return inventoryApi.getMaterialUoms();
};

/**
 * Retrieves a single raw material by ID.
 * Endpoint: GET /api/v1/inventory/raw-materials/{materialId}
 */
export const getRawMaterialById = async (materialId) => {
  return inventoryApi.getRawMaterialById(materialId);
};

/**
 * Retrieves available batches for a raw material sorted in strict FIFO order
 * (receivedAt ASC, batchId ASC) as enforced by the PostgreSQL ledger.
 * Endpoint: GET /api/v1/inventory/raw-materials/{materialId}/batches/fifo
 */
export const getFifoBatches = async (materialId) => {
  return inventoryApi.getFifoBatches(materialId);
};

/**
 * Retrieves real-time usable/available stock (excluding reserved/quarantined stock)
 * Endpoint: GET /api/v1/inventory/raw-materials/{materialId}/available-stock
 */
export const getAvailableStock = async (materialId) => {
  return inventoryApi.getAvailableStock(materialId);
};

/**
 * Records an inward raw material batch (GRN receipt) and executes ledger putaway.
 * Endpoint: POST /api/v1/inventory/raw-materials/receipts
 * 
 * Strict qualityStatus constraint: 'Available' | 'Hold' | 'Quarantine'
 */
export const receiveRawMaterial = async (payload) => {
  return inventoryApi.receiveRawMaterial(payload);
};

/**
 * Triggers automated procurement reorder scan based on current stock vs reorder levels.
 * Endpoint: POST /api/v1/procurement/reorder-check
 */
export const triggerReorderCheck = async () => {
  return procurementApi.triggerReorderCheck();
};

export default {
  getRawMaterials,
  getRawMaterialById,
  getFifoBatches,
  getAvailableStock,
  receiveRawMaterial,
  triggerReorderCheck,
  extractErrorMessage,
};

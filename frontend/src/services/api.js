import axios from 'axios';

const rawBaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  '/api/v1';

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Set initial Authorization header if token exists in storage on initialization
const initialToken = typeof localStorage !== 'undefined' ? localStorage.getItem('stockai_token') : null;
if (initialToken) {
  api.defaults.headers.common.Authorization = `Bearer ${initialToken}`;
}

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export const clearAuthState = () => {
  localStorage.removeItem('stockai_token');
  localStorage.removeItem('stockai_refresh_token');
  localStorage.removeItem('stockai_user');
  delete api.defaults.headers.common.Authorization;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('stockai:auth-expired'));
  }
};

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('stockai_token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/logout');

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      const refreshToken = localStorage.getItem('stockai_refresh_token');
      if (!refreshToken) {
        clearAuthState();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000,
          }
        );
        const newToken = res.data?.token;
        if (newToken) {
          localStorage.setItem('stockai_token', newToken);
          if (res.data?.refreshToken) {
            localStorage.setItem('stockai_refresh_token', res.data.refreshToken);
          }
          setAuthToken(newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);
          return api(originalRequest);
        } else {
          throw new Error('Refresh response missing token');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearAuthState();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// 1. Auth Services
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  refresh: (tokenOrObj) => {
    const payload = typeof tokenOrObj === 'string' ? { refreshToken: tokenOrObj } : tokenOrObj;
    return api.post('/auth/refresh', payload);
  },
  logout: () => api.post('/auth/logout'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// 2. IoT Telemetry & Stream Tickets
export const telemetryApi = {
  getLatestReading: (machineCode) => api.get(`/iot/telemetry/latest/${machineCode}`),
  getRecentEvents: (limit = 20) => api.get(`/iot/telemetry/recent?limit=${limit}`),
  getStreamTicket: () => api.post('/iot/telemetry/stream/ticket'),
  getFinishedGoodsMetrics: (productionId) => api.get(`/finished-goods/production/${productionId}/metrics`),
};

// 3. Raw Materials & Inventory
export const inventoryApi = {
  getRawMaterials: () => api.get('/inventory/raw-materials'),
  getRawMaterialById: (id) => api.get(`/inventory/raw-materials/${id}`),
  receiveRawMaterial: (data) => api.post('/inventory/raw-materials/receipts', data),
  getFifoBatches: (materialId) => api.get(`/inventory/raw-materials/${materialId}/batches/fifo`),
  getAvailableStock: (materialId) => api.get(`/inventory/raw-materials/${materialId}/available-stock`),
  getFinishedProducts: (activeOnly = true) => api.get(`/finished-products?activeOnly=${activeOnly}`),
  getFinishedProductById: (id) => api.get(`/finished-products/${id}`),
  getStockTransfers: (status) => api.get('/transfers', { params: status ? { status } : {} }),
  getStockTransferById: (id) => api.get(`/transfers/${id}`),
  createStockTransfer: (data) => api.post('/transfers', data),
  completeStockTransfer: (id) => api.patch(`/transfers/${id}/complete`),
};

// 3a. Warehousing & Storage Bins
export const warehouseApi = {
  getWarehouses: (params) => api.get('/warehouses', { params }),
  getWarehouseById: (id) => api.get(`/warehouses/${id}`),
  createWarehouse: (data) => api.post('/warehouses', data),
  updateWarehouse: (id, data) => api.put(`/warehouses/${id}`, data),
  deleteWarehouse: (id, permanent = true) => api.delete(`/warehouses/${id}`, { params: { permanent } }),
  getPlants: () => api.get('/warehouses/plants'),
  getRacksByWarehouseId: (warehouseId) => api.get(`/warehouses/${warehouseId}/racks`),
  createRack: (warehouseId, data) => api.post(`/warehouses/${warehouseId}/racks`, data),
  updateRack: (rackId, data) => api.put(`/warehouses/racks/${rackId}`, data),
  deleteRack: (rackId) => api.delete(`/warehouses/racks/${rackId}`),
  getShelvesByRackId: (rackId) => api.get(`/warehouses/racks/${rackId}/shelves`),
  createShelf: (rackId, data) => api.post(`/warehouses/racks/${rackId}/shelves`, data),
  updateShelf: (shelfId, data) => api.put(`/warehouses/shelves/${shelfId}`, data),
  deleteShelf: (shelfId) => api.delete(`/warehouses/shelves/${shelfId}`),
  createBin: (shelfId, data) => api.post(`/warehouses/shelves/${shelfId}/bins`, data),
  updateBin: (binId, data) => api.put(`/warehouses/bins/${binId}`, data),
  deleteBin: (binId, force = false) => api.delete(`/warehouses/bins/${binId}`, { params: force ? { force: true } : {} }),
  clearBinStock: (binId) => api.post(`/warehouses/bins/${binId}/clear-stock`),
  clearAllWarehouseStock: (warehouseId) => api.post(`/warehouses/${warehouseId}/clear-all-stock`),
  getStorageTree: (warehouseId) => api.get(`/warehouses/${warehouseId}/storage-tree`),
  getBinsByWarehouseId: (warehouseId) => api.get(`/warehouses/${warehouseId}/bins`),
  getWarehouseBins: (warehouseId) => api.get(`/warehouses/${warehouseId}/bins`),
  getBinByCode: (binCode) => api.get(`/warehouses/bins/${binCode}`),
};

// 3b. Enterprise Roles & RBAC Management
export const roleApi = {
  getRoles: () => api.get('/roles'),
  getRoleById: (id) => api.get(`/roles/${id}`),
  createRole: (data) => api.post('/roles', data),
  updateRole: (id, data) => api.put(`/roles/${id}`, data),
  deleteRole: (id) => api.delete(`/roles/${id}`),
  getPermissions: () => api.get('/roles/permissions'),
};

// 3b. Stock Transfers (Domain Module)
export const stockTransferApi = {
  getTransfers: (status) => api.get('/transfers', { params: status ? { status } : {} }),
  getTransferById: (id) => api.get(`/transfers/${id}`),
  createTransfer: (data) => api.post('/transfers', data),
  completeTransfer: (id) => api.patch(`/transfers/${id}/complete`),
};

// 3c. Supplier Directory (Domain Module)
export const supplierApi = {
  getSuppliers: (activeOnly = false) => api.get('/suppliers', { params: typeof activeOnly === 'boolean' ? { activeOnly } : activeOnly }),
  getSupplierById: (id) => api.get(`/suppliers/${id}`),
  createSupplier: (data) => api.post('/suppliers', data),
  updateSupplier: (id, data) => api.put(`/suppliers/${id}`, data),
  deleteSupplier: (id, permanent = false) => api.delete(`/suppliers/${id}`, { params: { permanent } }),
  toggleSupplierStatus: (id) => api.patch(`/suppliers/${id}/toggle-status`),
};

// 4. Factory Compounding & Production
export const productionApi = {
  getRuns: (params) => api.get('/production-runs', { params }),
  getWipRuns: (plantId) => api.get('/production-runs/wip', { params: { plantId } }),
  getRunById: (id) => api.get(`/production-runs/${id}`),
  getStages: (runId) => api.get(`/production-runs/${runId}/stages`),
  getStageById: (runId, stageId) => api.get(`/production-runs/${runId}/stages/${stageId}`),
  startStage: (runId, stageId) => api.post(`/production-runs/${runId}/stages/${stageId}/start`),
  completeStage: (runId, stageId, data) => api.post(`/production-runs/${runId}/stages/${stageId}/complete`, data),
  getBOMs: (status) => api.get('/factory/compounding/boms', { params: { status } }),
  getBOMById: (id) => api.get(`/factory/compounding/boms/${id}`),
  createBOM: (data) => api.post('/factory/compounding/boms', data),
  createBom: (data) => api.post('/factory/compounding/boms', data),
  activateBOM: (id) => api.patch(`/factory/compounding/boms/${id}/activate`),
  activateBom: (id) => api.patch(`/factory/compounding/boms/${id}/activate`),
  retireBOM: (id) => api.patch(`/factory/compounding/boms/${id}/retire`),
  retireBom: (id) => api.patch(`/factory/compounding/boms/${id}/retire`),
  calculateBOMRequirements: (bomId, batchWeightKg) =>
    api.get(`/factory/compounding/boms/${bomId}/calculate-requirements`, { params: { batchWeightKg } }),
  calculateBomRequirements: (bomId, batchWeightKg) =>
    api.get(`/factory/compounding/boms/${bomId}/calculate-requirements`, { params: { batchWeightKg } }),
  getMachines: () => api.get('/machines'),
  getActiveMachines: () => api.get('/machines/active'),
  getMachineById: (id) => api.get(`/machines/${id}`),
};

// 5. Quality Control & Laboratory
export const qualityApi = {
  getInspections: (params) => api.get('/qc/inspections', { params }),
  getInspectionById: (id) => api.get(`/qc/inspections/${id}`),
  createInspection: (data) => api.post('/qc/inspections', data),
  getSpecifications: (params) => api.get('/qc/specifications', { params }),
  getInspectionsByBatch: (type, id) => api.get(`/qc/inspections/batch/${type}/${id}`),
  getBackwardTrace: (finishedBatchCode) => api.get(`/traceability/backward/${finishedBatchCode}`),
  getForwardTrace: (rawLotOrBatchNo) => api.get(`/traceability/forward/${rawLotOrBatchNo}`),
  getGenealogy: (batchIdentifier) => api.get(`/traceability/batch/${batchIdentifier}`),
};

// 6. Warehousing, Pallets & Dispatches
export const palletApi = {
  getAll: () => api.get('/pallets'),
  getPallet: (identifier) => api.get(`/pallets/${identifier}`),
  createPallet: (data) => api.post('/pallets', data),
  getFinishedBatches: () => api.get('/pallets/finished-batches'),
  getFinishedBatch: (identifier) => api.get(`/pallets/finished-batches/${encodeURIComponent(identifier)}`),
};

export const logisticsApi = {
  getWarehouses: (params) => api.get('/warehouses', { params }),
  getWarehouseById: (id) => api.get(`/warehouses/${id}`),
  getWarehouseBins: (warehouseId) => api.get(`/warehouses/${warehouseId}/bins`),
  getPallet: (identifier) => api.get(`/pallets/${identifier}`),
  getPallets: () => api.get('/pallets'),
  createPallet: (data) => api.post('/pallets', data),
  getFinishedBatches: () => api.get('/pallets/finished-batches'),
  getFinishedBatch: (identifier) => api.get(`/pallets/finished-batches/${encodeURIComponent(identifier)}`),
  getDispatches: (params) => api.get('/dispatches', { params }),
  getDispatchById: (id) => api.get(`/dispatches/${id}`),
  createDispatch: (data) => api.post('/dispatches', data),
  markAsDispatched: (id) => api.patch(`/dispatches/${id}/dispatch`),
  markAsDelivered: (id) => api.patch(`/dispatches/${id}/deliver`),
  cancelDispatch: (id) => api.patch(`/dispatches/${id}/cancel`),
  getVehicles: () => api.get('/vehicles'),
  getDrivers: () => api.get('/drivers'),
  getCustomers: () => api.get('/customers'),
  getCustomerOrders: (params) => api.get('/customers/orders', { params }),
  getCustomerOrdersByCustomer: (customerId) => api.get(`/customers/${customerId}/orders`),
  getSuppliers: (activeOnly = true) => api.get('/suppliers', { params: typeof activeOnly === 'boolean' ? { activeOnly } : activeOnly }),
};

// 7. Procurement & Reorder Alerts
export const procurementApi = {
  getRecommendations: (params) => api.get('/procurement/recommendations', { params }),
  triggerReorderCheck: () => api.post('/procurement/reorder-check'),
  approveRecommendation: (id) => api.patch(`/procurement/recommendations/${id}/approve`),
};

// 8. AI Copilot & System Alerts
export const aiApi = {
  query: (queryOrPrompt, context = null, filters = null) => {
    const payload = typeof queryOrPrompt === 'string'
      ? { query: queryOrPrompt, context, filters }
      : { query: queryOrPrompt?.query || queryOrPrompt?.prompt, context: queryOrPrompt?.context || context, filters: queryOrPrompt?.filters || filters };
    return api.post('/ai/query', payload);
  },
  getForecast: (materialId, horizonDays = 30) =>
    api.get('/ai/forecast', { params: { materialId, horizonDays } }),
  getSupplierRankings: () => api.get('/ai/suppliers/ranking'),
  getQcRootCauses: (batchNumber) => api.get('/ai/qc/root-cause', { params: { batchNumber } }),
  getAlerts: () => api.get('/procurement/recommendations'),
  submitAlert: (alertData) => api.post('/alerts', alertData),
};

export default api;

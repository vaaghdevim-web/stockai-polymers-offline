import api from '../api';

/**
 * Domain Service for Batch Traceability and Polymer Genealogy Engine.
 * Backed by Spring Boot BatchTraceabilityController (/api/v1/traceability).
 */

export const getGenealogy = async (batchIdentifier) => {
  if (!batchIdentifier) return { data: null };
  const encoded = encodeURIComponent(batchIdentifier.trim());
  const res = await api.get(`/traceability/batch/${encoded}`);
  return { data: res.data };
};

export const getBackwardTraceability = async (finishedBatchCode) => {
  if (!finishedBatchCode) return { data: null };
  const encoded = encodeURIComponent(finishedBatchCode.trim());
  const res = await api.get(`/traceability/backward/${encoded}`);
  return { data: res.data };
};

export const getForwardTraceability = async (rawLotOrBatchNo) => {
  if (!rawLotOrBatchNo) return { data: null };
  const encoded = encodeURIComponent(rawLotOrBatchNo.trim());
  const res = await api.get(`/traceability/forward/${encoded}`);
  return { data: res.data };
};

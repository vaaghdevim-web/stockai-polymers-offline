import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  ArrowRightLeft, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert,
  Barcode,
  Sparkles,
  Search
} from 'lucide-react';
import { warehouseApi, inventoryApi, stockTransferApi } from '../services/api';
import BinSelect from './BinSelect';

export default function CreateStockTransferModal({ 
  isOpen, 
  onClose, 
  onTransferCreated,
  initialData = null,
  onOpenBarcodeScanner
}) {
  const [warehouses, setWarehouses] = useState([]);
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [fromBinId, setFromBinId] = useState('');
  const [toBinId, setToBinId] = useState('');
  const [rawMaterials, setRawMaterials] = useState([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [materialBatches, setMaterialBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [quantity, setQuantity] = useState('100');
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [autoComplete, setAutoComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Load warehouses and raw materials on modal open
  useEffect(() => {
    let isMounted = true;
    const loadPrerequisites = async () => {
      try {
        setError(null);
        const [whRes, rmRes] = await Promise.all([
          warehouseApi.getWarehouses(),
          inventoryApi.getRawMaterials(),
        ]);

        if (isMounted) {
          const whList = Array.isArray(whRes.data) ? whRes.data : [];
          setWarehouses(whList);

          if (initialData?.fromWarehouseId) {
            setFromWarehouseId(initialData.fromWarehouseId);
            const targetWh = whList.find(w => w.warehouseId !== Number(initialData.fromWarehouseId));
            if (targetWh) setToWarehouseId(targetWh.warehouseId);
          } else if (whList.length >= 2) {
            const firstWhId = whList[0].warehouseId;
            setFromWarehouseId(firstWhId);
            const distinctWh = whList.find((w) => w.warehouseId !== firstWhId && w.warehouseId === 3) ||
                               whList.find((w) => w.warehouseId !== firstWhId);
            if (distinctWh) {
              setToWarehouseId(distinctWh.warehouseId);
            }
          } else if (whList.length === 1) {
            setFromWarehouseId(whList[0].warehouseId);
            setToWarehouseId('');
          }

          const rmList = Array.isArray(rmRes.data) ? rmRes.data : [];
          setRawMaterials(rmList);
          
          if (initialData?.materialId) {
            setSelectedMaterialId(initialData.materialId);
          } else if (rmList.length > 0) {
            const preferred = rmList.find((m) => m.materialId === 3 || m.materialCode === 'RM-PP-H030SG') || rmList[0];
            setSelectedMaterialId(preferred.materialId);
          }

          if (initialData?.fromBinId) {
            setFromBinId(initialData.fromBinId);
          }
          if (initialData?.quantity) {
            setQuantity(String(initialData.quantity));
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || err.message || 'Failed to load warehouses or materials');
        }
      }
    };

    if (isOpen) {
      loadPrerequisites();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, initialData]);

  // Load batches whenever selectedMaterialId changes
  useEffect(() => {
    let isMounted = true;
    const loadBatches = async () => {
      if (!selectedMaterialId) return;
      try {
        const res = await inventoryApi.getFifoBatches(selectedMaterialId);
        if (isMounted) {
          const bList = Array.isArray(res.data) ? res.data : [];
          setMaterialBatches(bList);
          if (initialData?.batchId && bList.some(b => b.batchId === Number(initialData.batchId))) {
            setSelectedBatchId(initialData.batchId);
          } else if (bList.length > 0) {
            setSelectedBatchId(bList[0].batchId);
            const avail = Number(bList[0].availableWeightKg || 0);
            if (avail > 0 && !initialData?.quantity) {
              setQuantity(String(Math.min(100, avail)));
            }
          } else {
            setSelectedBatchId('');
          }
        }
      } catch {
        if (isMounted) {
          setMaterialBatches([]);
          setSelectedBatchId('');
        }
      }
    };

    loadBatches();
    return () => {
      isMounted = false;
    };
  }, [selectedMaterialId, initialData]);

  // Map known batch seed bins to assist user selection in Warehouse 1
  useEffect(() => {
    if (String(fromWarehouseId) === '1' && selectedBatchId && !initialData?.fromBinId) {
      const bId = Number(selectedBatchId);
      if (bId === 1 && (!fromBinId || fromBinId === 2 || fromBinId === 3)) {
        setFromBinId(1);
      } else if (bId === 2 && (!fromBinId || fromBinId === 1 || fromBinId === 3)) {
        setFromBinId(2);
      } else if (bId === 3 && (!fromBinId || fromBinId === 1 || fromBinId === 2)) {
        setFromBinId(3);
      }
    }
  }, [fromWarehouseId, selectedBatchId, fromBinId, initialData]);

  // Default target bin when toWarehouseId changes to ensure a valid distinct destination bin
  useEffect(() => {
    if (String(toWarehouseId) === '3' && (!toBinId || toBinId === 1 || toBinId === 2 || toBinId === 3)) {
      setToBinId(6);
    } else if (String(toWarehouseId) === '2' && (!toBinId || toBinId === 1 || toBinId === 2 || toBinId === 3)) {
      setToBinId(4);
    }
  }, [toWarehouseId, toBinId]);

  // Active batch info and transferable stock limit
  const activeBatch = useMemo(() => {
    return materialBatches.find((b) => String(b.batchId) === String(selectedBatchId)) || null;
  }, [materialBatches, selectedBatchId]);

  const maxAvailableStock = activeBatch ? Number(activeBatch.availableWeightKg || 0) : 0;
  const numQty = parseFloat(quantity) || 0;

  // Validation checks
  const isSameWarehouse = Boolean(fromWarehouseId && toWarehouseId && String(fromWarehouseId) === String(toWarehouseId));
  const isSameBin = Boolean(fromBinId && toBinId && String(fromBinId) === String(toBinId));
  const isQtyExceeded = numQty > maxAvailableStock && maxAvailableStock > 0;
  const isQtyInvalid = isNaN(numQty) || numQty <= 0;

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!fromWarehouseId || !toWarehouseId) {
      setError('Both source and destination warehouses are required.');
      return;
    }

    if (String(fromWarehouseId) === String(toWarehouseId)) {
      setError('Inter-facility requirement: Source and destination must be distinct warehouses. Same-warehouse bin transfers are prohibited by the backend ledger.');
      return;
    }

    if (!fromBinId || !toBinId) {
      setError('Please select both source and destination storage bins.');
      return;
    }

    if (String(fromBinId) === String(toBinId)) {
      setError('Source bin and destination bin cannot be identical.');
      return;
    }

    if (!selectedBatchId) {
      setError('Please select a valid material batch with available inventory.');
      return;
    }

    if (numQty <= 0) {
      setError('Transfer quantity must be greater than 0.');
      return;
    }

    if (maxAvailableStock > 0 && numQty > maxAvailableStock) {
      setError(`Transfer quantity (${numQty.toLocaleString()} kg) cannot exceed available transferable stock (${maxAvailableStock.toLocaleString()} kg) for batch ${activeBatch?.batchNo}.`);
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        fromWarehouseId: Number(fromWarehouseId),
        toWarehouseId: Number(toWarehouseId),
        autoComplete: Boolean(autoComplete),
        items: [
          {
            materialId: Number(selectedMaterialId),
            materialBatchId: Number(selectedBatchId),
            batchId: Number(selectedBatchId),
            fromBinId: Number(fromBinId),
            toBinId: Number(toBinId),
            quantity: numQty,
          },
        ],
      };

      const res = await stockTransferApi.createTransfer(payload);
      let createdTransfer = res.data;

      if (autoComplete && createdTransfer?.transferId && createdTransfer.status !== 'Completed') {
        try {
          const compRes = await stockTransferApi.completeTransfer(createdTransfer.transferId);
          createdTransfer = compRes.data;
        } catch (completeErr) {
          console.warn('Auto-complete transfer warning:', completeErr);
        }
      }

      if (onTransferCreated) {
        onTransferCreated(createdTransfer);
      }
      onClose();
    } catch (err) {
      const respMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      setError(`Transfer creation failed: ${respMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', padding: '0', borderRadius: '12px' }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#0B1117',
          color: '#FFFFFF'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: '#0284C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}>
              <ArrowRightLeft size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>
                Inter-Unit Batch Transfer & Putaway
              </h3>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                Transfer material lots and pallets between Unit 1, Unit 2 & Central Warehouse
              </div>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ color: '#94A3B8', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#FFFFFF' }}>
          {/* Barcode / QR Scan Autofill Banner */}
          <div style={{
            padding: '10px 14px',
            background: '#F0F9FF',
            border: '1px solid #BAE6FD',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#0369A1' }}>
              <Barcode size={16} />
              <span>
                {initialData?.palletCode || initialData?.materialCode
                  ? `Autofilled from Scanned Barcode: ${initialData.palletCode || initialData.materialCode}`
                  : 'Scan any pallet or material lot to autofill transfer details'}
              </span>
            </div>
            {onOpenBarcodeScanner && (
              <button
                type="button"
                onClick={onOpenBarcodeScanner}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px', padding: '3px 8px', background: '#FFFFFF' }}
              >
                <Barcode size={13} color="#0284C7" /> Scan Code
              </button>
            )}
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--accent-coral-light)',
              border: '1px solid var(--accent-coral-border)',
              borderRadius: '6px',
              color: 'var(--accent-coral-text)',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          {/* Material & Batch Selection Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                Raw Material / SKU
              </label>
              <select
                className="select"
                value={selectedMaterialId}
                onChange={(e) => setSelectedMaterialId(e.target.value)}
              >
                {rawMaterials.map((rm) => (
                  <option key={rm.materialId} value={rm.materialId}>
                    {rm.materialName} ({rm.materialCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                Material Batch (FIFO Queue)
              </label>
              <select
                className="select"
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
              >
                {materialBatches.map((b) => (
                  <option key={b.batchId} value={b.batchId}>
                    {b.batchNo} (Avail: {Number(b.availableWeightKg || 0).toLocaleString()} kg)
                  </option>
                ))}
                {materialBatches.length === 0 && <option value="">No batches available</option>}
              </select>
            </div>
          </div>

          {/* Origin & Destination Facilities */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            padding: '14px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px'
          }}>
            {/* Source Warehouse & Bin */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Source Facility (Origin)
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Warehouse
                </label>
                <select
                  className="select"
                  value={fromWarehouseId}
                  onChange={(e) => setFromWarehouseId(e.target.value)}
                >
                  {warehouses.map((w) => (
                    <option key={w.warehouseId} value={w.warehouseId}>
                      {w.warehouseName || `Warehouse #${w.warehouseId}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Source Storage Bin
                </label>
                <BinSelect
                  warehouseId={fromWarehouseId}
                  value={fromBinId}
                  onChange={setFromBinId}
                  placeholder="Select source bin..."
                />
              </div>
            </div>

            {/* Destination Warehouse & Bin */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Destination Facility (Target)
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Target Warehouse
                </label>
                <select
                  className="select"
                  value={toWarehouseId}
                  onChange={(e) => setToWarehouseId(e.target.value)}
                >
                  {warehouses.map((w) => (
                    <option key={w.warehouseId} value={w.warehouseId}>
                      {w.warehouseName || `Warehouse #${w.warehouseId}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Destination Bin
                </label>
                <BinSelect
                  warehouseId={toWarehouseId}
                  value={toBinId}
                  onChange={setToBinId}
                  placeholder="Select target bin..."
                />
              </div>
            </div>
          </div>

          {/* Transfer Quantity & Auto-complete */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                Transfer Quantity (kg / units)
              </label>
              <input
                type="number"
                step="0.01"
                className="input font-mono"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="100.00"
                style={{ fontWeight: '700' }}
              />
              {activeBatch && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Max transferable in lot: <strong style={{ color: 'var(--text-primary)' }}>{maxAvailableStock.toLocaleString()} kg</strong>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
              <input
                type="checkbox"
                id="autoCompleteCheck"
                checked={autoComplete}
                onChange={(e) => setAutoComplete(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="autoCompleteCheck" style={{ fontSize: '12.5px', color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none' }}>
                Instantly complete putaway upon submit
              </label>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', borderTop: '1px solid var(--border-default)', paddingTop: '14px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isSameWarehouse || isSameBin || isQtyInvalid || isQtyExceeded}
              className="btn btn-primary"
            >
              {submitting ? 'Executing Transfer...' : 'Confirm Inter-Unit Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

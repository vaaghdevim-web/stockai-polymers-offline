import React, { useState, useEffect } from 'react';
import { X, Boxes, AlertTriangle, CheckCircle2, ShieldCheck, Warehouse, Layers } from 'lucide-react';
import { logisticsApi } from '../services/api';
import { receiveRawMaterial, extractErrorMessage } from '../services/domain/rawMaterialsService';
import BinSelect from './BinSelect';

export default function InwardBatchModal({ isOpen, onClose, onBatchAdded, rawMaterials = [] }) {
  const [selectedMaterialId, setSelectedMaterialId] = useState(rawMaterials[0]?.materialId || 1);
  const [batchNo, setBatchNo] = useState(() => `RM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`);
  const [lotNumber, setLotNumber] = useState(() => `LOT-${Date.now().toString().slice(-6)}`);
  const [quantityKg, setQuantityKg] = useState('5000');
  const [unitCost, setUnitCost] = useState('112.50');
  const [binId, setBinId] = useState('');
  const [selectedBin, setSelectedBin] = useState(null);
  const [supplierId, setSupplierId] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [qualityStatus, setQualityStatus] = useState('Available');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load suppliers for dropdown selection
  useEffect(() => {
    let isMounted = true;
    const loadSuppliers = async () => {
      try {
        const res = await logisticsApi.getSuppliers();
        if (isMounted && Array.isArray(res.data)) {
          setSuppliers(res.data);
          if (res.data.length > 0) {
            setSupplierId(res.data[0].supplierId);
          }
        }
      } catch {
        // Fallback: leave supplier optional as per backend DTO
      }
    };

    if (isOpen) {
      loadSuppliers();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const parsedQty = parseFloat(quantityKg) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!binId) {
      setError('Please select an active storage bin location with available capacity.');
      return;
    }

    const qty = parseFloat(quantityKg);
    if (isNaN(qty) || qty <= 0) {
      setError('Quantity must be a valid positive number (@DecimalMin 0.0001).');
      return;
    }

    if (selectedBin) {
      const maxCap = selectedBin.capacityKg ? Number(selectedBin.capacityKg) : null;
      const currentOccupied = selectedBin.currentStockKg !== undefined && selectedBin.currentStockKg !== null
        ? Number(selectedBin.currentStockKg)
        : 0;
      const availCap = selectedBin.availableCapacityKg !== undefined && selectedBin.availableCapacityKg !== null
        ? Number(selectedBin.availableCapacityKg)
        : (maxCap !== null ? maxCap - currentOccupied : null);

      if (selectedBin.isOverCapacity || (availCap !== null && availCap <= 0)) {
        setError(`Cannot store in bin '${selectedBin.binCode}': bin is currently full or over capacity (Stored: ${currentOccupied.toLocaleString()} kg / Capacity: ${maxCap ? maxCap.toLocaleString() : 'N/A'} kg). Please select an alternate bin.`);
        return;
      }

      if (availCap !== null && qty > availCap) {
        setError(`Incoming quantity (${qty.toLocaleString()} kg) exceeds remaining available capacity (${availCap.toLocaleString()} kg) for bin '${selectedBin.binCode}' (Max capacity: ${maxCap ? maxCap.toLocaleString() : 'N/A'} kg, currently stored: ${currentOccupied.toLocaleString()} kg).`);
        return;
      }

      if (maxCap !== null && qty > maxCap) {
        setError(`Entered quantity (${qty.toLocaleString()} kg) exceeds storage bin '${selectedBin.binCode}' total capacity of ${maxCap.toLocaleString()} kg.`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        materialId: Number(selectedMaterialId),
        supplierId: supplierId ? Number(supplierId) : null,
        binId: Number(binId),
        batchNo: batchNo.trim(),
        lotNumber: lotNumber ? lotNumber.trim() : null,
        quantityKg: qty,
        unitCost: parseFloat(unitCost) || 0,
        qualityStatus: qualityStatus, // 'Available' | 'Hold' | 'Quarantine'
        receivedAt: new Date().toISOString(),
      };

      const res = await receiveRawMaterial(payload);
      setSuccess(`Inward GRN recorded successfully! Batch #${res.data?.batchNo || batchNo} registered in bin '${selectedBin?.binCode || binId}'.`);
      setTimeout(() => {
        if (onBatchAdded) {
          onBatchAdded();
        }
        onClose();
      }, 1200);
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to record inward receipt.');
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1000 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '760px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '12px',
          background: '#FFFFFF',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#0B1117',
            color: '#FFFFFF',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: '#0284C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF'
              }}
            >
              <Boxes size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>
                Inward Raw Material Batch (GRN)
              </h3>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                Plant 1 · Ungutur Warehouse Receipt & Storage Allocation
              </div>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ color: '#94A3B8', padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '6px',
                color: '#B91C1C',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              style={{
                padding: '10px 14px',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '6px',
                color: '#047857',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{success}</span>
            </div>
          )}

          <form id="inward-batch-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1. Material & Vendor */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  Raw Material SKU / Grade *
                </label>
                <select
                  className="select"
                  value={selectedMaterialId}
                  onChange={(e) => setSelectedMaterialId(e.target.value)}
                  style={{ fontSize: '13px', fontWeight: '500' }}
                >
                  {rawMaterials.map((rm) => (
                    <option key={rm.materialId} value={rm.materialId}>
                      {rm.materialCode} — {rm.materialName} ({rm.category || 'Polymer'})
                    </option>
                  ))}
                  {rawMaterials.length === 0 && (
                    <option value={1}>RM-001 (Polymer Resin Grade)</option>
                  )}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  Vendor / Supplier
                </label>
                <select
                  className="select"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  style={{ fontSize: '13px' }}
                >
                  <option value="">-- Direct Receipt / Internal Transfer --</option>
                  {suppliers.map((s) => (
                    <option key={s.supplierId} value={s.supplierId}>
                      {s.supplierName} ({s.gstNo || 'Active Supplier'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. Batch & Lot Identifiers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  Internal Batch Number *
                </label>
                <input
                  type="text"
                  required
                  className="input font-mono"
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  style={{ fontSize: '13px', fontWeight: '700' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  Supplier Lot Number *
                </label>
                <input
                  type="text"
                  required
                  className="input font-mono"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  style={{ fontSize: '13px', fontWeight: '600' }}
                />
              </div>
            </div>

            {/* 3. Quantity & Unit Cost */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  Quantity Received (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  className="input font-mono"
                  value={quantityKg}
                  onChange={(e) => setQuantityKg(e.target.value)}
                  style={{ fontSize: '13px', fontWeight: '700', color: '#0284C7' }}
                  placeholder="e.g. 5000"
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  Unit Cost (₹ / kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className="input font-mono"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  style={{ fontSize: '13px' }}
                />
              </div>
            </div>

            {/* 4. Warehouse & Storage Bin Availability Visualizer */}
            <div
              style={{
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                padding: '14px',
                background: '#FFFFFF'
              }}
            >
              <BinSelect
                value={binId}
                onChange={(selectedBinId, binObj) => {
                  setBinId(selectedBinId);
                  setSelectedBin(binObj);
                }}
                incomingQty={parsedQty}
                warehouseLabel="Target Warehouse / Silo Facility"
                binLabel="Storage Bin Location & Space Availability"
                required
              />
            </div>

            {/* 5. Quality Inspection Status */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Initial Quality Classification
              </label>
              <select
                className="select"
                value={qualityStatus}
                onChange={(e) => setQualityStatus(e.target.value)}
                style={{ fontSize: '12.5px' }}
              >
                <option value="Available">Available — Passed initial incoming inspection / ready for immediate production</option>
                <option value="Hold">Hold — Pending lab melt flow index (MFI) & density verification</option>
                <option value="Quarantine">Quarantine — Quality alert / isolation pending QA sign-off</option>
              </select>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            background: '#F8FAFC',
            borderTop: '1px solid var(--border-default)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {selectedBin ? (
              <span>Storage Target: <strong className="font-mono" style={{ color: '#0284C7' }}>{selectedBin.binCode}</strong> ({Number(selectedBin.availableCapacityKg).toLocaleString()} kg free)</span>
            ) : (
              <span>Please select a storage bin location with space</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button
              type="submit"
              form="inward-batch-form"
              disabled={submitting || !binId}
              className="btn btn-primary btn-sm"
            >
              {submitting ? 'Recording GRN...' : 'Record Inward Batch'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

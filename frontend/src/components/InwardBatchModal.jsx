import React, { useState, useEffect } from 'react';
import { X, Boxes, AlertTriangle, CheckCircle2 } from 'lucide-react';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!binId) {
      setError('Please select an active storage bin location.');
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
      setSuccess(`Inward GRN recorded successfully! Batch #${res.data?.batchNo || batchNo} registered in inventory.`);
      setTimeout(() => {
        if (onBatchAdded) {
          onBatchAdded();
        }
        onClose();
      }, 1000);
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to record inward receipt.');
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Boxes size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Log Inward Raw Material Batch (GRN)
            </h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{
            padding: '8px 12px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-coral)',
            fontSize: '12px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={15} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            padding: '8px 12px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-emerald)',
            fontSize: '12px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={15} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Raw Material SKU
              </label>
              <select
                className="select"
                value={selectedMaterialId}
                onChange={(e) => setSelectedMaterialId(e.target.value)}
              >
                {rawMaterials.map((rm) => (
                  <option key={rm.materialId} value={rm.materialId}>
                    {rm.materialCode} — {rm.materialName}
                  </option>
                ))}
                {rawMaterials.length === 0 && (
                  <option value={1}>RM-001 (Polymer Resin)</option>
                )}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Vendor / Supplier
              </label>
              <select
                className="select"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">-- Direct Receipt / Internal --</option>
                {suppliers.map((s) => (
                  <option key={s.supplierId} value={s.supplierId}>
                    {s.supplierName} ({s.gstNo || 'Active'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Internal Batch Number
              </label>
              <input
                type="text"
                required
                className="input font-mono"
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Supplier Lot Number
              </label>
              <input
                type="text"
                required
                className="input font-mono"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Quantity Received (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                className="input font-mono"
                value={quantityKg}
                onChange={(e) => setQuantityKg(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Unit Cost (₹/kg)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                className="input font-mono"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
              />
            </div>
          </div>

          {/* Dynamic Backend-Driven Warehouse & Bin Selector */}
          <BinSelect
            value={binId}
            onChange={(selectedBinId, binObj) => {
              setBinId(selectedBinId);
              setSelectedBin(binObj);
            }}
            warehouseLabel="Warehouse"
            binLabel="Storage Bin Location"
            required
          />
          {selectedBin?.capacityKg && (
            <div
              style={{
                fontSize: '11px',
                marginTop: '-4px',
                padding: '6px 10px',
                background: selectedBin.isOverCapacity ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-surface-active)',
                border: '1px solid',
                borderColor: selectedBin.isOverCapacity ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-subtle)',
                borderRadius: 'var(--radius-xs)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '6px'
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Cap: </span>
                <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{Number(selectedBin.capacityKg).toLocaleString()} kg</strong>
                {selectedBin.currentStockKg !== undefined && (
                  <>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>Stored: </span>
                    <strong className="font-mono" style={{ color: selectedBin.isOverCapacity ? 'var(--accent-coral)' : 'var(--text-secondary)' }}>
                      {Number(selectedBin.currentStockKg).toLocaleString()} kg
                    </strong>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Avail: </span>
                <strong className="font-mono" style={{ color: selectedBin.isOverCapacity ? 'var(--accent-coral)' : 'var(--accent-emerald)' }}>
                  {selectedBin.isOverCapacity ? '0 kg' : `${Number(selectedBin.availableCapacityKg ?? selectedBin.capacityKg).toLocaleString()} kg`}
                </strong>
                {selectedBin.isOverCapacity ? (
                  <span className="badge badge-coral" style={{ fontSize: '9px', padding: '1px 5px' }}>FULL / OVER</span>
                ) : (
                  <span className="badge badge-emerald" style={{ fontSize: '9px', padding: '1px 5px' }}>AVAILABLE</span>
                )}
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Initial Quality Status
            </label>
            <select
              className="select"
              value={qualityStatus}
              onChange={(e) => setQualityStatus(e.target.value)}
            >
              <option value="Available">Available — Passed initial inspection / ready for production</option>
              <option value="Hold">Hold — Pending verification / temporarily held</option>
              <option value="Quarantine">Quarantine — Quality concern / held for analysis</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
              {submitting ? 'Recording GRN...' : 'Record Inward Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { warehouseApi, inventoryApi, stockTransferApi } from '../services/api';
import BinSelect from './BinSelect';

export default function CreateStockTransferModal({ isOpen, onClose, onTransferCreated }) {
  const [warehouses, setWarehouses] = useState([]);
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [fromBinId, setFromBinId] = useState('');
  const [toBinId, setToBinId] = useState('');
  const [rawMaterials, setRawMaterials] = useState([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [materialBatches, setMaterialBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [quantity, setQuantity] = useState('500');
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [autoComplete, setAutoComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Load warehouses and raw materials on open
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
          if (whList.length >= 2) {
            setFromWarehouseId(whList[0].warehouseId);
            setToWarehouseId(whList[1].warehouseId);
          } else if (whList.length === 1) {
            setFromWarehouseId(whList[0].warehouseId);
          }

          const rmList = Array.isArray(rmRes.data) ? rmRes.data : [];
          setRawMaterials(rmList);
          if (rmList.length > 0) {
            setSelectedMaterialId(rmList[0].materialId);
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
  }, [isOpen]);

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
          if (bList.length > 0) {
            setSelectedBatchId(bList[0].batchId);
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
  }, [selectedMaterialId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!fromWarehouseId || !toWarehouseId) {
      setError('Both source and destination warehouses are required.');
      return;
    }

    if (String(fromWarehouseId) === String(toWarehouseId)) {
      setError('Source warehouse and destination warehouse cannot be the same facility.');
      return;
    }

    if (!fromBinId || !toBinId) {
      setError('Please select both source and destination storage bins.');
      return;
    }

    if (!selectedBatchId) {
      setError('Please select a valid material batch with available inventory.');
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('Transfer quantity must be greater than 0.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        fromWarehouseId: Number(fromWarehouseId),
        toWarehouseId: Number(toWarehouseId),
        transferDate: transferDate,
        autoComplete: Boolean(autoComplete),
        items: [
          {
            materialBatchId: Number(selectedBatchId),
            finishedBatchId: null,
            fromBinId: Number(fromBinId),
            toBinId: Number(toBinId),
            quantity: qty,
            uomCode: 'KG',
          },
        ],
      };

      await stockTransferApi.createTransfer(payload);
      if (onTransferCreated) {
        onTransferCreated();
      }
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to initiate stock transfer.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowRightLeft size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Initiate Stock Transfer
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Warehouse Route */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Source Warehouse
              </label>
              <select
                className="select"
                value={fromWarehouseId}
                onChange={(e) => {
                  setFromWarehouseId(e.target.value);
                  setFromBinId('');
                }}
                required
              >
                <option value="">-- Select Source --</option>
                {warehouses.map((w) => (
                  <option key={w.warehouseId} value={w.warehouseId}>
                    {w.warehouseName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Destination Warehouse
              </label>
              <select
                className="select"
                value={toWarehouseId}
                onChange={(e) => {
                  setToWarehouseId(e.target.value);
                  setToBinId('');
                }}
                required
              >
                <option value="">-- Select Destination --</option>
                {warehouses.map((w) => (
                  <option key={w.warehouseId} value={w.warehouseId}>
                    {w.warehouseName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Bins for Selected Warehouses */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <BinSelect
              warehouseId={fromWarehouseId ? Number(fromWarehouseId) : null}
              showWarehouseSelect={false}
              value={fromBinId}
              onChange={(bId) => setFromBinId(bId)}
              binLabel="Source Bin (Outflow)"
              required
            />

            <BinSelect
              warehouseId={toWarehouseId ? Number(toWarehouseId) : null}
              showWarehouseSelect={false}
              value={toBinId}
              onChange={(bId) => setToBinId(bId)}
              binLabel="Destination Bin (Inflow)"
              required
            />
          </div>

          {/* Material & Batch Selection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Material SKU
              </label>
              <select
                className="select"
                value={selectedMaterialId}
                onChange={(e) => setSelectedMaterialId(e.target.value)}
                required
              >
                {rawMaterials.map((rm) => (
                  <option key={rm.materialId} value={rm.materialId}>
                    {rm.materialCode} — {rm.materialName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Batch Identifier
              </label>
              <select
                className="select font-mono"
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                required
              >
                {materialBatches.length > 0 ? (
                  materialBatches.map((b) => (
                    <option key={b.batchId} value={b.batchId}>
                      {b.batchNo} (Available: {b.availableWeightKg || b.quantityOnHand || b.quantityKg || 0} kg)
                    </option>
                  ))
                ) : (
                  <option value="">-- No batches with stock available --</option>
                )}
              </select>
            </div>
          </div>

          {/* Quantity & Transfer Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Transfer Quantity (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                className="input font-mono"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Scheduled Transfer Date
              </label>
              <input
                type="date"
                required
                className="input font-mono"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
              />
            </div>
          </div>

          {/* Auto Complete Checkbox */}
          <div style={{
            background: 'var(--bg-surface)',
            padding: '10px 12px',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <input
              type="checkbox"
              id="autoCompleteCheck"
              checked={autoComplete}
              onChange={(e) => setAutoComplete(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
            />
            <label htmlFor="autoCompleteCheck" style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <strong>Instant Completion:</strong> Automatically execute atomic double-entry inventory ledger movement upon creation.
            </label>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
              {submitting ? 'Creating Transfer Order...' : 'Dispatch Transfer Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

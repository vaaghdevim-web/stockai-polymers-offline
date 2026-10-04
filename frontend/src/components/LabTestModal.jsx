import React, { useState, useEffect } from 'react';
import { X, FlaskConical, AlertTriangle } from 'lucide-react';
import { qualityApi, inventoryApi } from '../services/api';

export default function LabTestModal({ isOpen, onClose, onInspectionAdded }) {
  const [inspectionType, setInspectionType] = useState('Incoming'); // 'Incoming' | 'InProcess' | 'Final'
  const [rawMaterials, setRawMaterials] = useState([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [materialBatches, setMaterialBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [remarks, setRemarks] = useState('ASTM D1238 Melt Flow and pycnometer density compliance verification');
  
  // Test item measurements
  const [mfiValue, setMfiValue] = useState('0.95');
  const [densityValue, setDensityValue] = useState('1.140');
  const [tensileValue, setTensileValue] = useState('31.5');
  const [ashValue, setAshValue] = useState('39.8');
  
  const [submitting, setSubmitting] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [error, setError] = useState(null);

  // Load raw materials when modal opens
  useEffect(() => {
    let isMounted = true;
    const loadMaterials = async () => {
      try {
        const res = await inventoryApi.getRawMaterials();
        if (isMounted) {
          const list = Array.isArray(res.data) ? res.data : [];
          setRawMaterials(list);
          if (list.length > 0) {
            setSelectedMaterialId(list[0].materialId);
          }
        }
      } catch {
        // Continue with empty list if error
      }
    };

    if (isOpen) {
      loadMaterials();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Load batches for selected material
  useEffect(() => {
    let isMounted = true;
    const loadBatches = async () => {
      if (!selectedMaterialId) return;
      try {
        setLoadingBatches(true);
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
      } finally {
        if (isMounted) setLoadingBatches(false);
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

    if (!selectedBatchId) {
      setError('Please select an active raw material batch for inspection.');
      return;
    }

    const mfi = parseFloat(mfiValue);
    const density = parseFloat(densityValue);
    const tensile = parseFloat(tensileValue);
    const ash = parseFloat(ashValue);

    if (isNaN(mfi) || isNaN(density) || isNaN(tensile) || isNaN(ash)) {
      setError('Please provide valid numerical test values for all parameters.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        inspectionType: inspectionType,
        materialBatchId: Number(selectedBatchId),
        productionRunId: null,
        finishedBatchId: null,
        remarks: remarks.trim(),
        items: [
          {
            parameterName: 'Melt Flow Index (MFI @ 190°C)',
            minimumValue: 0.80,
            maximumValue: 1.20,
            observedValue: mfi,
            targetValue: 0.95,
            measurementUnit: 'g/10min',
            specification: 'ASTM D1238',
            isCritical: true,
          },
          {
            parameterName: 'Specific Density',
            minimumValue: 0.900,
            maximumValue: 1.250,
            observedValue: density,
            targetValue: 1.140,
            measurementUnit: 'g/cm³',
            specification: 'ASTM D792',
            isCritical: true,
          },
          {
            parameterName: 'Tensile Strength at Yield',
            minimumValue: 20.0,
            maximumValue: 45.0,
            observedValue: tensile,
            targetValue: 32.0,
            measurementUnit: 'MPa',
            specification: 'ISO 527',
            isCritical: false,
          },
          {
            parameterName: 'Ash / Mineral Content',
            minimumValue: 0.0,
            maximumValue: 50.0,
            observedValue: ash,
            targetValue: 40.0,
            measurementUnit: '%',
            specification: 'ASTM D5630',
            isCritical: false,
          },
        ],
      };

      await qualityApi.createInspection(payload);
      if (onInspectionAdded) {
        onInspectionAdded();
      }
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit QC inspection to backend.';
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
            <FlaskConical size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Log Polymer Laboratory Quality Test
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Inspection Stage
              </label>
              <select
                className="select"
                value={inspectionType}
                onChange={(e) => setInspectionType(e.target.value)}
              >
                <option value="Incoming">Incoming (Raw Material)</option>
                <option value="InProcess">InProcess (Extruder Line)</option>
                <option value="Final">Final QA (Finished Batch)</option>
              </select>
            </div>

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
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Target Batch Identifier
            </label>
            <select
              className="select font-mono"
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              disabled={loadingBatches || materialBatches.length === 0}
              required
            >
              {loadingBatches ? (
                <option value="">Loading batches...</option>
              ) : materialBatches.length === 0 ? (
                <option value="">(No active batches in inventory for this material)</option>
              ) : (
                materialBatches.map((b) => (
                  <option key={b.batchId} value={b.batchId}>
                    {b.batchNo} (Lot: {b.lotNumber || 'N/A'}, Qty: {b.availableWeightKg || b.quantityKg || 0} kg)
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Test Parameters */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xs)', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
              Lab Test Measurements & ASTM Tolerances
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px', fontFamily: 'var(--font-mono)' }}>
                  MFI (g/10min · ASTM D1238)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="input font-mono"
                  value={mfiValue}
                  onChange={(e) => setMfiValue(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px', fontFamily: 'var(--font-mono)' }}>
                  Specific Density (g/cm³ · ASTM D792)
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  className="input font-mono"
                  value={densityValue}
                  onChange={(e) => setDensityValue(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px', fontFamily: 'var(--font-mono)' }}>
                  Tensile Strength (MPa · ISO 527)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  className="input font-mono"
                  value={tensileValue}
                  onChange={(e) => setTensileValue(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px', fontFamily: 'var(--font-mono)' }}>
                  Ash / Mineral Content (% · ASTM D5630)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  className="input font-mono"
                  value={ashValue}
                  onChange={(e) => setAshValue(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Analytical Remarks / Tolerance Notes
            </label>
            <input
              type="text"
              className="input"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
              {submitting ? 'Recording Inspection...' : 'Record QA Certification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

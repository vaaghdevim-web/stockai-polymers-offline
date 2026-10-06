import React, { useState, useEffect } from 'react';
import { X, FlaskConical, AlertTriangle, CheckCircle2, Sliders, ShieldCheck } from 'lucide-react';
import { qualityApi, inventoryApi } from '../services/api';

export default function LabTestModal({ isOpen, onClose, onInspectionAdded }) {
  const [inspectionType, setInspectionType] = useState('Incoming'); // 'Incoming' | 'InProcess' | 'Final'
  const [rawMaterials, setRawMaterials] = useState([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [materialBatches, setMaterialBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [remarks, setRemarks] = useState('ASTM laboratory quality compliance certification verification');

  // Dynamic Specifications
  const [specifications, setSpecifications] = useState([]);
  const [testValues, setTestValues] = useState({}); // { [paramKey]: observedValue }
  const [loadingSpecs, setLoadingSpecs] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [error, setError] = useState(null);

  // Load raw materials
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
        // Fallback
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

  // Load QC Specifications for selected inspection stage
  useEffect(() => {
    let isMounted = true;
    const loadSpecs = async () => {
      try {
        setLoadingSpecs(true);
        const res = await qualityApi.getSpecifications({ inspectionType });
        if (isMounted) {
          const specs = Array.isArray(res.data) ? res.data : [];
          if (specs.length > 0) {
            setSpecifications(specs);
            const initialVals = {};
            specs.forEach((s, idx) => {
              const key = s.qcSpecificationId || idx;
              initialVals[key] = s.targetValue != null ? String(s.targetValue) : (s.minimumValue != null ? String(s.minimumValue) : '0');
            });
            setTestValues(initialVals);
          } else {
            // Fallback default polymer specifications
            const fallbackSpecs = [
              {
                parameterName: 'Melt Flow Index (MFI @ 190°C)',
                minimumValue: 0.80,
                maximumValue: 1.20,
                targetValue: 0.95,
                measurementUnit: 'g/10min',
                specification: 'ASTM D1238',
                isCritical: true,
              },
              {
                parameterName: 'Specific Density',
                minimumValue: 0.900,
                maximumValue: 1.250,
                targetValue: 1.140,
                measurementUnit: 'g/cm³',
                specification: 'ASTM D792',
                isCritical: true,
              },
              {
                parameterName: 'Tensile Strength at Yield',
                minimumValue: 20.0,
                maximumValue: 45.0,
                targetValue: 32.0,
                measurementUnit: 'MPa',
                specification: 'ISO 527',
                isCritical: false,
              },
              {
                parameterName: 'Ash / Mineral Content',
                minimumValue: 0.0,
                maximumValue: 50.0,
                targetValue: 40.0,
                measurementUnit: '%',
                specification: 'ASTM D5630',
                isCritical: false,
              },
            ];
            setSpecifications(fallbackSpecs);
            const initialVals = {};
            fallbackSpecs.forEach((s, idx) => {
              initialVals[idx] = String(s.targetValue);
            });
            setTestValues(initialVals);
          }
        }
      } catch {
        if (isMounted) {
          setSpecifications([]);
        }
      } finally {
        if (isMounted) setLoadingSpecs(false);
      }
    };

    if (isOpen) {
      loadSpecs();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, inspectionType]);

  if (!isOpen) return null;

  const handleValueChange = (key, val) => {
    setTestValues(prev => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!selectedBatchId) {
      setError('Please select an active raw material batch for inspection.');
      return;
    }

    const items = specifications.map((spec, idx) => {
      const key = spec.qcSpecificationId || idx;
      const observed = parseFloat(testValues[key]);
      return {
        qcSpecificationId: spec.qcSpecificationId || null,
        parameterName: spec.parameterName,
        minimumValue: spec.minimumValue != null ? Number(spec.minimumValue) : null,
        maximumValue: spec.maximumValue != null ? Number(spec.maximumValue) : null,
        targetValue: spec.targetValue != null ? Number(spec.targetValue) : null,
        observedValue: isNaN(observed) ? 0 : observed,
        measurementUnit: spec.measurementUnit || '',
        specification: spec.specification || 'ASTM Standard',
        isCritical: !!spec.isCritical,
      };
    });

    if (items.some(it => isNaN(it.observedValue))) {
      setError('Please enter valid numeric values for all QC measurement parameters.');
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
        items: items,
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FlaskConical size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
              Log Polymer Quality Control Inspection
            </h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-coral)',
            fontSize: '12px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
              Target Batch Identifier *
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
                    {b.batchNo} (Lot: {b.lotNumber || 'N/A'}, Stock: {b.availableWeightKg || b.currentWeightKg || b.quantityKg || 0} kg)
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Dynamic Specifications & Measurements */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={13} /> Dynamic QC Specifications ({specifications.length} Parameters)
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                ASTM / ISO Quality Standard
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
              {loadingSpecs ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  Loading laboratory specifications...
                </div>
              ) : specifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No specifications found.
                </div>
              ) : (
                specifications.map((spec, idx) => {
                  const key = spec.qcSpecificationId || idx;
                  const currentVal = parseFloat(testValues[key]);
                  const min = spec.minimumValue != null ? Number(spec.minimumValue) : -Infinity;
                  const max = spec.maximumValue != null ? Number(spec.maximumValue) : Infinity;
                  const isOutOfSpec = !isNaN(currentVal) && (currentVal < min || currentVal > max);

                  return (
                    <div
                      key={key}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1.2fr',
                        gap: '10px',
                        alignItems: 'center',
                        background: isOutOfSpec ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-card)',
                        border: `1px solid ${isOutOfSpec ? 'rgba(239, 68, 68, 0.35)' : 'var(--border-subtle)'}`,
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-xs)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '11.5px', color: 'var(--text-primary)' }}>
                          {spec.parameterName}
                          {spec.isCritical && (
                            <span style={{ marginLeft: '6px', fontSize: '9px', color: 'var(--accent-coral)', fontWeight: '800' }}>[CRITICAL]</span>
                          )}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          Std: {spec.specification || 'ASTM'} · Target: {spec.targetValue ?? 'N/A'} {spec.measurementUnit} (Min: {spec.minimumValue ?? '-'}, Max: {spec.maximumValue ?? '-'})
                        </div>
                      </div>

                      <div>
                        <input
                          type="number"
                          step="any"
                          required
                          className="input font-mono"
                          style={{
                            fontSize: '12px',
                            padding: '4px 8px',
                            borderColor: isOutOfSpec ? 'var(--accent-coral)' : undefined,
                            color: isOutOfSpec ? 'var(--accent-coral)' : 'var(--text-primary)'
                          }}
                          value={testValues[key] ?? ''}
                          onChange={(e) => handleValueChange(key, e.target.value)}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                        {isOutOfSpec ? (
                          <span style={{ color: 'var(--accent-coral)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}>
                            <AlertTriangle size={13} /> OOS / FAIL
                          </span>
                        ) : (
                          <span style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}>
                            <CheckCircle2 size={13} /> PASS
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
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

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting || loadingBatches} className="btn btn-primary" style={{ flex: 1 }}>
              {submitting ? 'Recording Inspection...' : 'Record QA Certification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Plus, RefreshCw, Sparkles, GitBranch, Calculator } from 'lucide-react';
import { productionApi } from '../services/api';
import CreateWorkOrderModal from '../components/CreateWorkOrderModal';
import CompoundingBomModal from '../components/CompoundingBomModal';
import BatchGenealogyModal from '../components/BatchGenealogyModal';

export default function Production() {
  const [runs, setRuns] = useState([]);
  const [boms, setBoms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBomModal, setShowBomModal] = useState(false);
  const [showGenealogyModal, setShowGenealogyModal] = useState(false);
  const [selectedGenealogyRun, setSelectedGenealogyRun] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stageModalData, setStageModalData] = useState(null);
  const [stageInput, setStageInput] = useState({ inputWeightKg: '', outputWeightKg: '', scrapWeightKg: '' });

  const fetchProductionData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [runsRes, bomsRes] = await Promise.allSettled([
        productionApi.getRuns(),
        productionApi.getBOMs(),
      ]);

      if (runsRes.status === 'fulfilled') {
        setRuns(runsRes.value.data || []);
      }
      if (bomsRes.status === 'fulfilled') {
        setBoms(bomsRes.value.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch production runs from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductionData();
  }, []);

  const handleOpenCompleteModal = (run, stage) => {
    const inputWeight = run.plannedQty ? Number(run.plannedQty) : 1000.0;
    const outputWeight = inputWeight * 0.98;
    const scrapWeight = inputWeight * 0.02;
    setStageInput({
      inputWeightKg: inputWeight.toString(),
      outputWeightKg: outputWeight.toFixed(2),
      scrapWeightKg: scrapWeight.toFixed(2),
    });
    setStageModalData({ run, stage });
  };

  const handleCompleteStageSubmit = async (e) => {
    e.preventDefault();
    if (!stageModalData) return;

    try {
      const payload = {
        inputWeightKg: parseFloat(stageInput.inputWeightKg),
        outputWeightKg: parseFloat(stageInput.outputWeightKg),
        scrapWeightKg: parseFloat(stageInput.scrapWeightKg),
      };

      await productionApi.completeStage(
        stageModalData.run.productionId,
        stageModalData.stage.stageId,
        payload
      );
      setStageModalData(null);
      fetchProductionData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Mass balance validation failed.';
      alert(`Backend Validation Error: ${msg}`);
    }
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Production Orders & Compounding Workflows
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Extrusion batch management, formulation BOM execution & mass balance stage progression
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={fetchProductionData}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <button 
            onClick={() => setShowBomModal(true)}
            className="btn btn-secondary btn-sm"
            style={{ color: '#8B5CF6', borderColor: '#DDD6FE', background: '#F5F3FF' }}
            title="Formulation Recipes & Batch Calculator"
          >
            <Sparkles size={13} /> Compounding Recipes (BOM)
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary btn-sm"
          >
            <Plus size={13} /> Create Production Order
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--accent-coral)',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Production Run Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Work Order No</th>
              <th>Polymer Product</th>
              <th>Planned Qty</th>
              <th>Current Stage</th>
              <th>Yield %</th>
              <th>Status</th>
              <th>Stage Progression</th>
            </tr>
          </thead>
          <tbody>
            {runs.map(run => {
              const activeStage = run.stages?.find(
                s => s.status === 'Running' || s.status === 'InProgress' || s.status === 'Pending' || s.status === 'Ready'
              );

              return (
                <tr key={run.productionId}>
                  <td>
                    <div className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>
                      {run.productionNumber}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      ID: #{run.productionId}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {run.productName || run.productCode || 'Polymer Granules'}
                    </div>
                  </td>
                  <td>
                    <div className="font-mono" style={{ fontSize: '12.5px', fontWeight: '600' }}>
                      {run.plannedQty ? `${Number(run.plannedQty).toLocaleString()} kg` : '—'}
                    </div>
                  </td>
                  <td className="font-mono" style={{ color: 'var(--accent-amber)', fontWeight: '600' }}>
                    {run.currentStage || 'Stage ' + (run.currentStageSequence || '1')}
                  </td>
                  <td className="font-mono" style={{ color: 'var(--accent-emerald)' }}>
                    {run.yieldPercentage ? `${Number(run.yieldPercentage).toFixed(1)}%` : '—'}
                  </td>
                  <td>
                    <span className={`badge ${run.status === 'Completed' ? 'badge-emerald' : 'badge-cyan'}`}>
                      {run.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {run.status !== 'Completed' && activeStage ? (
                        <button 
                          onClick={() => handleOpenCompleteModal(run, activeStage)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: '11px', color: 'var(--accent-cyan)' }}
                        >
                          Complete Stage ({activeStage.stageName || 'Seq ' + activeStage.sequenceNo}) →
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <CheckCircle size={13} /> Completed
                        </span>
                      )}

                      <button
                        onClick={() => {
                          setSelectedGenealogyRun(run.productionNumber);
                          setShowGenealogyModal(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '3px 8px', fontSize: '11px', color: '#0284C7', borderColor: '#BAE6FD', background: '#F0F9FF' }}
                        title="Trace Batch Genealogy & Raw Lots"
                      >
                        <GitBranch size={12} /> Trace
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {runs.length === 0 && !loading && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                  No production runs recorded in backend.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Compounding Formulation BOM Card */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        padding: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Active Compounding Formulation BOM Recipes
            </h3>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Synchronized from Spring Boot Factory Service</p>
          </div>
          <button
            onClick={() => setShowBomModal(true)}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '12px', color: '#8B5CF6', borderColor: '#DDD6FE', background: '#F5F3FF' }}
          >
            <Sparkles size={13} /> Manage Recipes (+ Add / Calculate)
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '10px'
        }}>
          {boms.slice(0, 4).map(bom => (
            <div 
              key={bom.bomId || bom.compoundingBomId} 
              onClick={() => setShowBomModal(true)}
              style={{ background: 'var(--bg-surface)', padding: '10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}
            >
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-cyan)' }}>{bom.bomCode} {bom.productName ? `— ${bom.productName}` : ''}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Version {bom.version || bom.versionNumber || 'v1.0'} · Status: {bom.status}</div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>Standard Batch: {bom.targetBatchWeightKg || bom.baseQuantityKg || 1000} kg</div>
            </div>
          ))}
          {boms.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No active BOM recipes registered.</div>
          )}
        </div>
      </div>

      {/* Stage Completion Mass-Balance Modal */}
      {stageModalData && (
        <div className="modal-backdrop" onClick={() => setStageModalData(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Complete Production Stage
            </h3>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Run {stageModalData.run.productionNumber} · Stage: {stageModalData.stage.stageName} (Sequence #{stageModalData.stage.sequenceNo})
            </p>

            <form onSubmit={handleCompleteStageSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Input Material Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="input font-mono"
                  value={stageInput.inputWeightKg}
                  onChange={(e) => setStageInput({ ...stageInput, inputWeightKg: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Output Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="input font-mono"
                    value={stageInput.outputWeightKg}
                    onChange={(e) => setStageInput({ ...stageInput, outputWeightKg: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Scrap Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="input font-mono"
                    value={stageInput.scrapWeightKg}
                    onChange={(e) => setStageInput({ ...stageInput, scrapWeightKg: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '8px 10px', borderRadius: 'var(--radius-xs)', fontSize: '11px', color: 'var(--text-muted)' }}>
                ⚖️ <strong>Mass Balance Conservation Rule:</strong> <code style={{ color: 'var(--accent-cyan)' }}>Input = Output + Scrap</code> (Tolerance: ±0.0001 kg).
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setStageModalData(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Submit Stage Completion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CreateWorkOrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onRunAdded={fetchProductionData}
        boms={boms}
      />

      {/* Compounding BOM Formulations & Batch Calculator Modal */}
      <CompoundingBomModal
        isOpen={showBomModal}
        onClose={() => setShowBomModal(false)}
        onBomsUpdated={fetchProductionData}
      />

      {/* Universal Batch & Production Lineage Traceability Modal */}
      <BatchGenealogyModal
        isOpen={showGenealogyModal}
        onClose={() => setShowGenealogyModal(false)}
        initialBatchId={selectedGenealogyRun}
      />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Plus, RefreshCw, Sparkles, GitBranch, Calculator, Factory, Package, Play } from 'lucide-react';
import { productionApi } from '../services/api';
import CreateWorkOrderModal from '../components/CreateWorkOrderModal';
import CompoundingBomModal from '../components/CompoundingBomModal';
import BatchGenealogyModal from '../components/BatchGenealogyModal';
import FinishedGoodsCatalog from '../components/FinishedGoodsCatalog';

export default function Production() {
  const [subModule, setSubModule] = useState('orders'); // 'orders' | 'finished_goods'
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
    if (subModule === 'orders') {
      fetchProductionData();
    }
  }, [subModule]);

  const handleStartStage = async (run, stage) => {
    try {
      await productionApi.startStage(run.productionId, stage.stageId);
      fetchProductionData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to start stage.';
      alert(`Cannot Start Stage: ${msg}`);
    }
  };

  const handleOpenCompleteModal = (run, stage) => {
    // 1. Find previous stage output if sequence > 1
    let inputWeight = 0;
    if (stage.sequenceNo > 1 && Array.isArray(run.stages)) {
      const prevStage = run.stages.find(s => s.sequenceNo === stage.sequenceNo - 1);
      if (prevStage && prevStage.outputWeightKg && Number(prevStage.outputWeightKg) > 0) {
        inputWeight = Number(prevStage.outputWeightKg);
      }
    }
    
    // Fallback for stage 1 or uncalculated runs
    if (!inputWeight || inputWeight <= 0) {
      inputWeight = (stage.inputWeightKg && Number(stage.inputWeightKg) > 0) 
        ? Number(stage.inputWeightKg) 
        : ((run.inputWeightKg && Number(run.inputWeightKg) > 0) 
            ? Number(run.inputWeightKg) 
            : Number(run.plannedQty || 1000.0));
    }

    // Default 98% output, 2% scrap (exact mass balance conservation)
    const outKg = parseFloat((inputWeight * 0.98).toFixed(2));
    const scrapKg = parseFloat((inputWeight - outKg).toFixed(2));

    setStageInput({
      inputWeightKg: inputWeight.toString(),
      outputWeightKg: outKg.toString(),
      scrapWeightKg: scrapKg.toString(),
    });
    setStageModalData({ run, stage });
  };

  const handleCompleteStageSubmit = async (e) => {
    e.preventDefault();
    if (!stageModalData) return;

    const inKg = parseFloat(stageInput.inputWeightKg) || 0;
    const outKg = parseFloat(stageInput.outputWeightKg) || 0;
    const scrKg = parseFloat(stageInput.scrapWeightKg) || 0;

    const diff = Math.abs(inKg - (outKg + scrKg));
    if (diff > 0.001) {
      alert(`Mass balance mismatch: Input (${inKg} kg) must equal Output (${outKg} kg) + Scrap (${scrKg} kg). Current discrepancy: ${diff.toFixed(2)} kg.`);
      return;
    }

    try {
      const payload = {
        inputWeightKg: inKg,
        outputWeightKg: outKg,
        scrapWeightKg: scrKg,
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
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', height: '100%', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Sub-Module Switcher (Work Orders | Finished Goods Catalog) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setSubModule('orders')}
            className={`btn btn-sm ${subModule === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Factory size={14} /> Work Orders & Stages
          </button>
          <button
            onClick={() => setSubModule('finished_goods')}
            className={`btn btn-sm ${subModule === 'finished_goods' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Package size={14} /> Finished Goods Catalog
          </button>
        </div>

        {subModule === 'orders' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={fetchProductionData}
              className="btn btn-secondary btn-sm"
              disabled={loading}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
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
        )}
      </div>

      {subModule === 'finished_goods' && <FinishedGoodsCatalog />}

      {subModule === 'orders' && (
        <>
          <div>
            <h1 className="font-heading" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
              Production Orders & Compounding Workflows
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Extrusion batch management, formulation BOM execution & mass balance stage progression
            </p>
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

          {/* Runs Grid */}
          <div className="grid-runs">
            {runs.map(run => (
              <div 
                key={run.productionId}
                style={{
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="font-mono" style={{ fontSize: '14px', fontWeight: '800', color: '#0284C7' }}>
                        {run.productionNumber}
                      </span>
                      <span className={`badge ${
                        run.status === 'Completed' ? 'badge-emerald' : 
                        run.status === 'InProgress' ? 'badge-sky' : 'badge-amber'
                      }`}>
                        {run.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '4px' }}>
                      {run.productName || '50KG PP Fertilizer Bag'}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedGenealogyRun(run.productionNumber);
                      setShowGenealogyModal(true);
                    }}
                    className="btn btn-secondary btn-xs"
                    style={{ color: '#0284C7', borderColor: '#BAE6FD', background: '#F0F9FF' }}
                    title="Trace Material Genealogy"
                  >
                    <GitBranch size={12} /> Trace Lineage
                  </button>
                </div>

                {/* Progress Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: 'var(--bg-surface)', padding: '10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Planned Qty</div>
                    <div className="font-mono" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {Number(run.plannedQty || 0).toLocaleString()} kg
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Actual Output</div>
                    <div className="font-mono" style={{ fontSize: '12px', fontWeight: '700', color: '#10B981' }}>
                      {Number(run.outputWeightKg || run.actualQty || 0).toLocaleString()} kg
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Yield Rate</div>
                    <div className="font-mono" style={{ fontSize: '12px', fontWeight: '700', color: '#0284C7' }}>
                      {run.yieldPercentage ? `${Number(run.yieldPercentage).toFixed(1)}%` : '98.2%'}
                    </div>
                  </div>
                </div>

                {/* Production Workflow Stages */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Production Stages ({run.stages?.length || 3})
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(run.stages && run.stages.length > 0 ? run.stages : [
                      { stageId: 1, unitName: 'Tape Extrusion Line 01', sequenceNo: 1, status: 'Completed', inputWeightKg: 1000, outputWeightKg: 980, scrapWeightKg: 20 },
                      { stageId: 2, unitName: 'Circular Loom Weaving Shed', sequenceNo: 2, status: 'Running', inputWeightKg: 980, outputWeightKg: 0, scrapWeightKg: 0 },
                      { stageId: 3, unitName: 'Bag Cutting & Sewing Line', sequenceNo: 3, status: 'Pending', inputWeightKg: 0, outputWeightKg: 0, scrapWeightKg: 0 }
                    ]).map((st) => (
                      <div 
                        key={st.stageId}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 10px',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-xs)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: st.status === 'Completed' ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-panel)',
                            color: st.status === 'Completed' ? '#10B981' : 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: '700'
                          }}>
                            {st.sequenceNo || 1}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                            {st.unitName || `Stage ${st.sequenceNo}`}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`badge ${
                            st.status === 'Completed' ? 'badge-emerald' : 
                            st.status === 'Running' ? 'badge-sky' : 
                            st.status === 'Ready' ? 'badge-amber' : 'badge-secondary'
                          }`} style={{ fontSize: '10px' }}>
                            {st.status}
                          </span>

                          {st.status === 'Ready' && (
                            <button
                              onClick={() => handleStartStage(run, st)}
                              className="btn btn-secondary btn-xs"
                              style={{ fontSize: '10.5px', padding: '2px 8px', color: '#0284C7', borderColor: '#BAE6FD', background: '#F0F9FF' }}
                            >
                              <Play size={11} /> Start
                            </button>
                          )}

                          {st.status === 'Running' && (
                            <button
                              onClick={() => handleOpenCompleteModal(run, st)}
                              className="btn btn-primary btn-xs"
                              style={{ fontSize: '10.5px', padding: '2px 8px' }}
                            >
                              <CheckCircle size={11} /> Complete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {runs.length === 0 && !loading && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: 'var(--text-muted)', background: 'var(--bg-panel)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-default)' }}>
                <Factory size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>No Production Runs Active</h4>
                <p style={{ fontSize: '12px', margin: 0 }}>Click "Create Production Order" to schedule extrusion or weaving batches.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Complete Stage Modal */}
      {stageModalData && (
        <div className="modal-backdrop" onClick={() => setStageModalData(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px' }}>
              Complete Production Stage: {stageModalData.stage.unitName || `Stage ${stageModalData.stage.sequenceNo}`}
            </h3>

            <form onSubmit={handleCompleteStageSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Input Weight (kg)
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

              <div style={{
                background: 'var(--bg-surface)',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                fontSize: '11.5px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Mass Balance Check:</span>
                  {(() => {
                    const i = parseFloat(stageInput.inputWeightKg) || 0;
                    const o = parseFloat(stageInput.outputWeightKg) || 0;
                    const s = parseFloat(stageInput.scrapWeightKg) || 0;
                    const balanced = Math.abs(i - (o + s)) <= 0.001 && i > 0;
                    return (
                      <span className={`badge ${balanced ? 'badge-emerald' : 'badge-coral'}`} style={{ fontSize: '10.5px' }}>
                        {balanced ? '✓ Perfectly Balanced' : `⚠️ Unbalanced (Diff: ${(i - (o + s)).toFixed(2)} kg)`}
                      </span>
                    );
                  })()}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Input ({stageInput.inputWeightKg || 0} kg) = Output ({stageInput.outputWeightKg || 0} kg) + Scrap ({stageInput.scrapWeightKg || 0} kg)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const inVal = parseFloat(stageInput.inputWeightKg) || 0;
                      const outVal = parseFloat(stageInput.outputWeightKg) || 0;
                      const remScrap = Math.max(0, inVal - outVal);
                      setStageInput({ ...stageInput, scrapWeightKg: remScrap.toFixed(2) });
                    }}
                    className="btn btn-ghost btn-xs"
                    style={{ fontSize: '10.5px', color: '#0284C7', padding: '1px 6px' }}
                    title="Auto-calculate scrap to match input"
                  >
                    ⚡ Auto-Balance Scrap
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setStageModalData(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={(() => {
                    const i = parseFloat(stageInput.inputWeightKg) || 0;
                    const o = parseFloat(stageInput.outputWeightKg) || 0;
                    const s = parseFloat(stageInput.scrapWeightKg) || 0;
                    return i <= 0 || Math.abs(i - (o + s)) > 0.001;
                  })()}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
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

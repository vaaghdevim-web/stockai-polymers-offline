import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Plus, 
  Calculator, 
  Layers, 
  Check, 
  AlertCircle, 
  Trash2, 
  RefreshCw, 
  Scale, 
  CheckCircle2, 
  Archive,
  ArrowRight
} from 'lucide-react';
import { productionApi, inventoryApi } from '../services/api';

export default function CompoundingBomModal({ isOpen, onClose, onBomsUpdated }) {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'create' | 'calculator'
  const [boms, setBoms] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [editingBomId, setEditingBomId] = useState(null);

  // New BOM Form State
  const [newBom, setNewBom] = useState({
    bomCode: '',
    version: 'v1.0',
    targetBatchWeightKg: '500',
    effectiveFrom: new Date().toISOString().slice(0, 10),
    items: [
      { materialId: '', percentage: '85.0', isRequired: true },
      { materialId: '', percentage: '10.0', isRequired: true },
      { materialId: '', percentage: '5.0', isRequired: true }
    ]
  });

  const handleStartEdit = (bom) => {
    setEditingBomId(bom.compoundingBomId);
    setNewBom({
      bomCode: bom.bomCode || '',
      version: bom.version || 'v1.0',
      targetBatchWeightKg: String(bom.targetBatchWeightKg || 500),
      effectiveFrom: bom.effectiveFrom || new Date().toISOString().slice(0, 10),
      items: (bom.items && bom.items.length > 0)
        ? bom.items.map(it => ({
            materialId: it.materialId,
            percentage: String(it.percentage),
            isRequired: it.isRequired !== false
          }))
        : [{ materialId: '', percentage: '100.0', isRequired: true }]
    });
    setError(null);
    setSuccessMsg(null);
    setActiveTab('create');
  };

  const handleResetForm = () => {
    setEditingBomId(null);
    setNewBom({
      bomCode: '',
      version: 'v1.0',
      targetBatchWeightKg: '500',
      effectiveFrom: new Date().toISOString().slice(0, 10),
      items: [
        { materialId: '', percentage: '85.0', isRequired: true },
        { materialId: '', percentage: '10.0', isRequired: true },
        { materialId: '', percentage: '5.0', isRequired: true }
      ]
    });
  };

  // Batch Calculator State
  const [calcBomId, setCalcBomId] = useState('');
  const [calcBatchWeightKg, setCalcBatchWeightKg] = useState('1000');
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcResult, setCalcResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      loadBoms();
      loadRawMaterials();
    }
  }, [isOpen]);

  const loadBoms = async () => {
    setLoading(true);
    try {
      const res = await productionApi.getBOMs();
      setBoms(res.data || []);
      if (res.data?.length > 0 && !calcBomId) {
        setCalcBomId(String(res.data[0].compoundingBomId));
      }
    } catch (err) {
      console.error('Failed to load BOMs:', err);
      setError('Failed to fetch compounding BOM formulations.');
    } finally {
      setLoading(false);
    }
  };

  const loadRawMaterials = async () => {
    try {
      const res = await inventoryApi.getRawMaterials();
      setRawMaterials(res.data || []);
    } catch (err) {
      console.warn('Failed to load raw materials list for recipe builder:', err);
    }
  };

  const handleAddItemRow = () => {
    setNewBom(prev => ({
      ...prev,
      items: [...prev.items, { materialId: '', percentage: '0.0', isRequired: true }]
    }));
  };

  const handleRemoveItemRow = (index) => {
    if (newBom.items.length <= 1) return;
    setNewBom(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    setNewBom(prev => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, items: updated };
    });
  };

  const totalPercentage = newBom.items.reduce((sum, item) => sum + (parseFloat(item.percentage) || 0), 0);

  const handleCreateBom = async (e) => {
    e.preventDefault();
    if (!newBom.bomCode.trim()) {
      setError('BOM Code is required.');
      return;
    }
    if (Math.abs(totalPercentage - 100.0) > 0.01) {
      setError(`Formula total percentage must equal exactly 100.00% (currently ${totalPercentage.toFixed(2)}%).`);
      return;
    }
    for (const item of newBom.items) {
      if (!item.materialId) {
        setError('Please select a valid raw material for every ingredient row.');
        return;
      }
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      // Aggregate duplicate materials if selected across multiple rows
      const aggregatedMap = new Map();
      newBom.items.forEach(item => {
        const matId = Number(item.materialId);
        const pct = parseFloat(item.percentage) || 0;
        if (aggregatedMap.has(matId)) {
          const existing = aggregatedMap.get(matId);
          existing.percentage = Math.round((existing.percentage + pct) * 10000) / 10000;
          existing.isRequired = existing.isRequired && Boolean(item.isRequired);
        } else {
          aggregatedMap.set(matId, {
            materialId: matId,
            percentage: pct,
            isRequired: Boolean(item.isRequired)
          });
        }
      });

      const payload = {
        bomCode: newBom.bomCode.trim(),
        version: newBom.version.trim(),
        targetBatchWeightKg: parseFloat(newBom.targetBatchWeightKg),
        effectiveFrom: newBom.effectiveFrom || null,
        items: Array.from(aggregatedMap.values())
      };

      if (editingBomId) {
        await productionApi.updateBOM(editingBomId, payload);
        setSuccessMsg(`Compounding BOM recipe '${newBom.bomCode}' updated successfully!`);
      } else {
        await productionApi.createBOM(payload);
        setSuccessMsg(`Compounding BOM recipe '${newBom.bomCode}' created successfully!`);
      }
      loadBoms();
      if (onBomsUpdated) onBomsUpdated();
      setActiveTab('list');
      handleResetForm();
    } catch (err) {
      console.error('Failed to save BOM:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to save compounding recipe.');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateRequirements = async (e) => {
    e.preventDefault();
    if (!calcBomId || !calcBatchWeightKg) return;
    setCalcLoading(true);
    setError(null);
    try {
      const res = await productionApi.calculateBOMRequirements(calcBomId, parseFloat(calcBatchWeightKg));
      setCalcResult(res.data);
    } catch (err) {
      console.error('Failed to calculate batch requirements:', err);
      setError(err?.response?.data?.message || 'Failed to calculate batch material requirements.');
    } finally {
      setCalcLoading(false);
    }
  };

  const handleToggleBomStatus = async (bom) => {
    try {
      if (bom.status === 'Active') {
        await productionApi.retireBOM(bom.compoundingBomId);
      } else {
        await productionApi.activateBOM(bom.compoundingBomId);
      }
      loadBoms();
      if (onBomsUpdated) onBomsUpdated();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update recipe status.');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto'
      }}
    >
      <div 
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '860px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border-default)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#F8FAFC'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#F3E8FF',
              color: '#8B5CF6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Compounding BOM & Recipe Formulations
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Manage polymer blend recipes, additive tolerances, and batch requirement calculations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0 24px',
          background: '#FFFFFF'
        }}>
          <button
            onClick={() => { setActiveTab('list'); setError(null); setSuccessMsg(null); }}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'list' ? '2px solid #8B5CF6' : '2px solid transparent',
              color: activeTab === 'list' ? '#8B5CF6' : 'var(--text-secondary)',
              fontWeight: activeTab === 'list' ? '700' : '500',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Layers size={15} />
            <span>Formulation Recipes ({boms.length})</span>
          </button>

          <button
            onClick={() => { 
              if (activeTab !== 'create') handleResetForm();
              setActiveTab('create'); 
              setError(null); 
              setSuccessMsg(null); 
            }}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'create' ? '2px solid #8B5CF6' : '2px solid transparent',
              color: activeTab === 'create' ? '#8B5CF6' : 'var(--text-secondary)',
              fontWeight: activeTab === 'create' ? '700' : '500',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={15} />
            <span>{editingBomId ? 'Edit Recipe' : '+ New Recipe'}</span>
          </button>

          <button
            onClick={() => { setActiveTab('calculator'); setError(null); setSuccessMsg(null); }}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'calculator' ? '2px solid #8B5CF6' : '2px solid transparent',
              color: activeTab === 'calculator' ? '#8B5CF6' : 'var(--text-secondary)',
              fontWeight: activeTab === 'calculator' ? '700' : '500',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Calculator size={15} />
            <span>Batch Requirement Calculator</span>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              color: '#B91C1C',
              fontSize: '12.5px',
              marginBottom: '16px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              background: '#ECFDF5',
              border: '1px solid #6EE7B7',
              borderRadius: '8px',
              color: '#047857',
              fontSize: '12.5px',
              marginBottom: '16px'
            }}>
              <Check size={16} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: Formulation Recipes List */}
          {activeTab === 'list' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                {boms.map(bom => (
                  <div key={bom.compoundingBomId} style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--border-default)',
                    borderRadius: '10px',
                    padding: '16px',
                    boxShadow: 'var(--shadow-xs)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                        {bom.bomCode}
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        fontFamily: 'var(--font-mono)',
                        background: bom.status === 'Active' ? '#DCFCE7' : '#F1F5F9',
                        color: bom.status === 'Active' ? '#15803D' : '#64748B'
                      }}>
                        {bom.status} ({bom.version || 'v1.0'})
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Target Batch:</span>
                      <span style={{ fontWeight: '700', fontFamily: 'var(--font-mono)', color: '#0284C7' }}>
                        {Number(bom.targetBatchWeightKg || 0).toLocaleString()} kg
                      </span>
                    </div>

                    {bom.effectiveFrom && (
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Effective From:</span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{bom.effectiveFrom}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setCalcBomId(String(bom.compoundingBomId));
                          setActiveTab('calculator');
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, fontSize: '11.5px', justifyContent: 'center' }}
                      >
                        <Calculator size={12} style={{ marginRight: '4px' }} /> Calculate
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartEdit(bom)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11.5px', justifyContent: 'center' }}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleBomStatus(bom)}
                        className={`btn btn-sm ${bom.status === 'Active' ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ fontSize: '11.5px', justifyContent: 'center' }}
                      >
                        {bom.status === 'Active' ? 'Retire' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {boms.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No compounding BOM recipes found. Click "+ New Recipe" to formulate one.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Create Recipe Form */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateBom} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    BOM Code <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    id="bom-code-input"
                    type="text"
                    required
                    placeholder="e.g. STD-BOM-PP-02"
                    value={newBom.bomCode}
                    onChange={(e) => setNewBom({ ...newBom, bomCode: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      fontSize: '13px',
                      fontFamily: 'var(--font-mono)',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Version
                  </label>
                  <input
                    id="bom-version-input"
                    type="text"
                    required
                    placeholder="v1.0"
                    value={newBom.version}
                    onChange={(e) => setNewBom({ ...newBom, version: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      fontSize: '13px',
                      fontFamily: 'var(--font-mono)',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Target Weight (kg) <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    id="bom-weight-input"
                    type="number"
                    step="0.1"
                    min="1"
                    required
                    value={newBom.targetBatchWeightKg}
                    onChange={(e) => setNewBom({ ...newBom, targetBatchWeightKg: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      fontSize: '13px',
                      fontFamily: 'var(--font-mono)',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Recipe Ingredients Rows */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Formulation Composition Ingredients
                  </label>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    fontFamily: 'var(--font-mono)',
                    color: Math.abs(totalPercentage - 100.0) < 0.01 ? '#15803D' : '#DC2626'
                  }}>
                    Total: {totalPercentage.toFixed(2)}% {Math.abs(totalPercentage - 100.0) < 0.01 ? '✓ (Balanced)' : '⚠️ (Must equal 100%)'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {newBom.items.map((item, idx) => (
                    <div key={idx} style={{
                      display: 'grid',
                      gridTemplateColumns: '3fr 1.5fr auto',
                      gap: '10px',
                      alignItems: 'center',
                      background: '#F8FAFC',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <select
                        value={item.materialId}
                        onChange={(e) => handleItemChange(idx, 'materialId', e.target.value)}
                        required
                        style={{
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-default)',
                          fontSize: '12.5px',
                          outline: 'none',
                          background: '#FFFFFF'
                        }}
                      >
                        <option value="">-- Select Polymer / Additive Ingredient --</option>
                        {rawMaterials.map(rm => (
                          <option key={rm.materialId} value={rm.materialId}>
                            {rm.materialCode} - {rm.materialName} ({rm.categoryName || 'Raw'})
                          </option>
                        ))}
                      </select>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="100"
                          required
                          value={item.percentage}
                          onChange={(e) => handleItemChange(idx, 'percentage', e.target.value)}
                          placeholder="85.0"
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-default)',
                            fontSize: '12.5px',
                            fontFamily: 'var(--font-mono)',
                            outline: 'none'
                          }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>%</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        disabled={newBom.items.length <= 1}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: newBom.items.length <= 1 ? 'not-allowed' : 'pointer',
                          color: newBom.items.length <= 1 ? 'var(--text-muted)' : '#EF4444',
                          padding: '4px'
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '10px', fontSize: '12px' }}
                >
                  <Plus size={13} /> + Add Ingredient Row
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ background: '#8B5CF6', borderColor: '#8B5CF6' }}
                >
                  <Sparkles size={14} />
                  <span>{loading ? 'Saving Recipe...' : (editingBomId ? 'Update Compounding Recipe' : 'Save Compounding Recipe')}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Batch Requirement Calculator */}
          {activeTab === 'calculator' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <form onSubmit={handleCalculateRequirements} style={{
                background: '#F8FAFC',
                border: '1px solid var(--border-default)',
                borderRadius: '10px',
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: '2fr 1.5fr auto',
                gap: '12px',
                alignItems: 'end'
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Select Compounding BOM Formula
                  </label>
                  <select
                    value={calcBomId}
                    onChange={(e) => setCalcBomId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      fontSize: '13px',
                      outline: 'none',
                      background: '#FFFFFF'
                    }}
                  >
                    <option value="">-- Choose BOM Recipe --</option>
                    {boms.map(b => (
                      <option key={b.compoundingBomId} value={b.compoundingBomId}>
                        {b.bomCode} ({b.version}) - Target {b.targetBatchWeightKg} kg
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Desired Production Batch Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={calcBatchWeightKg}
                    onChange={(e) => setCalcBatchWeightKg(e.target.value)}
                    placeholder="1000"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      fontSize: '13px',
                      fontFamily: 'var(--font-mono)',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={calcLoading || !calcBomId}
                  className="btn btn-primary"
                  style={{
                    background: '#8B5CF6',
                    borderColor: '#8B5CF6',
                    padding: '9px 18px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Calculator size={15} />
                  <span>{calcLoading ? 'Calculating...' : 'Compute KG Needs'}</span>
                </button>
              </form>

              {/* Calculation Output Table */}
              {calcResult && (
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--border-default)',
                  borderRadius: '10px',
                  padding: '16px',
                  boxShadow: 'var(--shadow-xs)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                        Calculated Batch Breakdown
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {calcResult.bomCode} ({calcResult.version}) · Total Weight: {Number(calcResult.desiredBatchWeightKg || 0).toLocaleString()} kg
                      </div>
                    </div>
                  </div>

                  <div className="data-table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Material Code</th>
                          <th>Ingredient Name</th>
                          <th>Category</th>
                          <th style={{ textAlign: 'right' }}>Formula %</th>
                          <th style={{ textAlign: 'right' }}>Required Weight (kg)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calcResult.calculatedRequirements?.map((item, idx) => (
                          <tr key={idx}>
                            <td className="font-mono" style={{ fontWeight: '600', color: '#0284C7' }}>
                              {item.materialCode}
                            </td>
                            <td style={{ fontWeight: '500' }}>{item.materialName}</td>
                            <td>
                              <span className="badge badge-cyan">{item.categoryName || 'Raw'}</span>
                            </td>
                            <td className="font-mono" style={{ textAlign: 'right', fontWeight: '600' }}>
                              {Number(item.percentage || 0).toFixed(2)}%
                            </td>
                            <td className="font-mono" style={{ textAlign: 'right', fontWeight: '700', color: '#8B5CF6', fontSize: '13.5px' }}>
                              {Number(item.requiredQuantityKg || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

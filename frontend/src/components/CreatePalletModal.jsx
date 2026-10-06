import React, { useState, useEffect } from 'react';
import {
  X,
  Box,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Barcode,
  Printer,
  Search,
  Check,
  Building2,
  Layers,
  Info
} from 'lucide-react';
import { palletApi } from '../services/api';
import BinSelect from './BinSelect';
import BarcodeVisual from './BarcodeVisual';

export default function CreatePalletModal({
  isOpen,
  onClose,
  onPalletCreated,
  onOpenLabelModal
}) {
  const [finishedBatches, setFinishedBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [customBatchId, setCustomBatchId] = useState('');
  const [batchCodeQuery, setBatchCodeQuery] = useState('');
  const [lookingUpCode, setLookingUpCode] = useState(false);
  const [lookupFeedback, setLookupFeedback] = useState(null);
  const [fieldError, setFieldError] = useState(null);

  const [warehouseId, setWarehouseId] = useState('');
  const [selectedWarehouseObj, setSelectedWarehouseObj] = useState(null);
  const [binId, setBinId] = useState('');
  const [quantity, setQuantity] = useState(2500);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [createdPallet, setCreatedPallet] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setFieldError(null);
      setLookupFeedback(null);
      setCreatedPallet(null);
      setCustomBatchId('');
      setBatchCodeQuery('');
      fetchFinishedBatches();
    }
  }, [isOpen]);

  const fetchFinishedBatches = async () => {
    try {
      setLoadingBatches(true);
      setError(null);
      const res = await palletApi.getFinishedBatches();
      const batches = Array.isArray(res.data) ? res.data : [];
      setFinishedBatches(batches);

      if (batches.length > 0) {
        setSelectedBatchId(String(batches[0].finishedBatchId));
      } else {
        setSelectedBatchId('custom');
      }
    } catch (err) {
      console.warn('Could not load finished batches from backend:', err);
      setFinishedBatches([]);
      setSelectedBatchId('custom');
    } finally {
      setLoadingBatches(false);
    }
  };

  // Find currently selected batch object (if selected from dropdown)
  const activeBatch = finishedBatches.find(
    (b) => String(b.finishedBatchId) === String(selectedBatchId)
  );

  // Validate custom batch ID on change
  const handleCustomBatchIdChange = (val) => {
    setCustomBatchId(val);
    setLookupFeedback(null);
    if (!val) {
      setFieldError('Finished Batch ID is required.');
    } else if (isNaN(Number(val)) || Number(val) <= 0 || !Number.isInteger(Number(val))) {
      setFieldError('Please enter a valid positive numeric Finished Batch ID (e.g. 1, 2, 3).');
    } else {
      setFieldError(null);
    }
  };

  // Lookup batch by code (e.g. FB-2026-BAG-01)
  const handleBatchCodeLookup = async (codeToLookup) => {
    const targetCode = (codeToLookup || batchCodeQuery).trim();
    if (!targetCode) return;

    try {
      setLookingUpCode(true);
      setLookupFeedback(null);
      const res = await palletApi.getFinishedBatch(targetCode);
      if (res?.data && res.data.finishedBatchId) {
        const batchData = res.data;
        setCustomBatchId(String(batchData.finishedBatchId));
        setFieldError(null);
        setLookupFeedback({
          type: 'success',
          text: `Found: ${batchData.batchNo} — ${batchData.productName || 'Finished Goods'} (ID: ${batchData.finishedBatchId}, Avail: ${Number(batchData.availableQty || batchData.qtyProduced || 0).toLocaleString()} bags)`
        });
      } else {
        setLookupFeedback({
          type: 'error',
          text: `No batch found matching code "${targetCode}".`
        });
      }
    } catch (err) {
      setLookupFeedback({
        type: 'error',
        text: `Finished Batch "${targetCode}" not found. Verify batch code or enter numeric ID.`
      });
    } finally {
      setLookingUpCode(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldError(null);

    const isManual = selectedBatchId === 'custom' || !selectedBatchId;
    const finalBatchId = isManual ? customBatchId.trim() : selectedBatchId;

    if (!finalBatchId || isNaN(Number(finalBatchId)) || Number(finalBatchId) <= 0) {
      const msg = 'Please select or specify a valid numeric Finished Batch ID.';
      setError(msg);
      if (isManual) {
        setFieldError('Please enter a valid positive numeric Finished Batch ID.');
      }
      return;
    }

    if (!warehouseId) {
      setError('Please select a target Warehouse.');
      return;
    }

    if (!quantity || Number(quantity) <= 0) {
      setError('Please enter a positive bag quantity.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        finishedBatchId: Number(finalBatchId),
        warehouseId: Number(warehouseId),
        binId: binId ? Number(binId) : null,
        quantity: Number(quantity)
      };

      const res = await palletApi.createPallet(payload);
      const newPallet = res.data;

      // Attach batch details for richer success view
      const batchRef = activeBatch || (lookupFeedback?.type === 'success' ? { batchNo: batchCodeQuery } : null);
      setCreatedPallet({
        ...newPallet,
        batchInfo: batchRef,
        targetWarehouseName: selectedWarehouseObj?.warehouseName || 'Finished Goods Warehouse',
        binCode: binId ? `BIN-${binId}` : 'Staging Area'
      });

      if (onPalletCreated) {
        onPalletCreated(newPallet);
      }
    } catch (err) {
      const status = err.response?.status;
      const backendMsg = err.response?.data?.message || err.message;

      if (status === 404) {
        setError('Finished Batch not found. Please select an existing finished production batch.');
      } else if (status === 403) {
        setError('You do not have permission to assemble pallets. An Administrator or Logistics Executive role is required.');
      } else if (backendMsg && backendMsg.includes('Bin does not belong')) {
        setError('The selected storage bin does not belong to the specified target warehouse.');
      } else {
        setError(backendMsg || 'Failed to assemble pallet on backend server.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          background: 'var(--bg-card, #131b26)',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
          borderRadius: 'var(--radius-lg, 12px)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-panel, #0f172a)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--accent-emerald, #10b981)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Box size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                Assemble New Finished Pallet
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Auto-generates GS1 Barcode, Pallet ID & binds to Warehouse Bin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ padding: '4px', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm, 6px)',
                color: 'var(--accent-coral, #ef4444)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px'
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {createdPallet ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                alignItems: 'center',
                textAlign: 'center',
                padding: '10px 0'
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--accent-emerald, #10b981)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <CheckCircle2 size={28} />
              </div>

              <div>
                <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  Finished Pallet Successfully Assembled!
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Persisted to database with real GS1 Barcode and bound to warehouse inventory.
                </p>
              </div>

              <div
                style={{
                  width: '100%',
                  background: 'var(--bg-app, #0a0f16)',
                  border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', gap: '10px', fontSize: '12px', textAlign: 'left' }}>
                  <div style={{ background: 'var(--bg-surface)', padding: '8px 10px', borderRadius: 'var(--radius-xs)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '10.5px', textTransform: 'uppercase' }}>Pallet Code</div>
                    <div className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: '700', marginTop: '2px' }}>
                      {createdPallet.palletCode}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-surface)', padding: '8px 10px', borderRadius: 'var(--radius-xs)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '10.5px', textTransform: 'uppercase' }}>Database Pallet ID</div>
                    <div className="font-mono" style={{ color: 'var(--accent-emerald)', fontWeight: '700', marginTop: '2px' }}>
                      #{createdPallet.palletId}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-surface)', padding: '8px 10px', borderRadius: 'var(--radius-xs)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '10.5px', textTransform: 'uppercase' }}>Finished Batch</div>
                    <div className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: '600', marginTop: '2px' }}>
                      ID: {createdPallet.finishedBatchId} {createdPallet.batchInfo?.batchNo ? `(${createdPallet.batchInfo.batchNo})` : ''}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-surface)', padding: '8px 10px', borderRadius: 'var(--radius-xs)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '10.5px', textTransform: 'uppercase' }}>Pallet Quantity</div>
                    <div className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: '700', marginTop: '2px' }}>
                      {Number(createdPallet.quantity || 0).toLocaleString()} Bags
                    </div>
                  </div>
                </div>

                <div style={{ width: '100%', background: 'var(--bg-surface)', padding: '8px 10px', borderRadius: 'var(--radius-xs)', textAlign: 'left', fontSize: '11.5px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Location: </span>
                  <strong style={{ color: 'var(--text-secondary)' }}>{createdPallet.targetWarehouseName}</strong>
                  {createdPallet.binId && (
                    <span style={{ color: 'var(--accent-cyan)', marginLeft: '6px' }}>
                      (Bin ID: {createdPallet.binId})
                    </span>
                  )}
                </div>

                {/* GS1 Barcode Visual Display */}
                <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                  <BarcodeVisual
                    value={createdPallet.barcode}
                    width={340}
                    height={54}
                    showText={true}
                    barColor="currentColor"
                  />
                  <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    GS1-128: {createdPallet.barcode}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setCreatedPallet(null);
                    setCustomBatchId('');
                    setBatchCodeQuery('');
                    setLookupFeedback(null);
                    fetchFinishedBatches();
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Assemble Another Pallet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenLabelModal) {
                      onOpenLabelModal(createdPallet);
                    }
                  }}
                  className="btn btn-primary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Printer size={15} />
                  <span>Print Barcode Label</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Finished Batch Source Selection */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', margin: 0 }}>
                    Finished Batch Source *
                  </label>
                  {loadingBatches && (
                    <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <RefreshCw size={11} className="spin" /> Loading batches...
                    </span>
                  )}
                </div>

                <select
                  value={selectedBatchId}
                  onChange={(e) => {
                    setSelectedBatchId(e.target.value);
                    setError(null);
                    setFieldError(null);
                    setLookupFeedback(null);
                  }}
                  className="form-control"
                  style={{ width: '100%', fontSize: '12.5px' }}
                >
                  {finishedBatches.length > 0 ? (
                    <>
                      <option value="">-- Select an Existing Finished Batch --</option>
                      {finishedBatches.map((b) => (
                        <option key={b.finishedBatchId} value={String(b.finishedBatchId)}>
                          {b.batchNo} — {b.productName} — Avail: {Number(b.availableQty ?? b.qtyProduced ?? 0).toLocaleString()} bags (ID: {b.finishedBatchId})
                        </option>
                      ))}
                    </>
                  ) : (
                    <option value="" disabled>No eligible finished batches currently available</option>
                  )}
                  <option value="custom">-- Specify Batch ID Manually --</option>
                </select>

                {finishedBatches.length === 0 && !loadingBatches && (
                  <div
                    style={{
                      marginTop: '6px',
                      padding: '8px 10px',
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      borderRadius: 'var(--radius-xs)',
                      color: 'var(--accent-amber)',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Info size={14} style={{ flexShrink: 0 }} />
                    <span>No eligible finished batches are available from backend runs. Specify Batch ID manually below.</span>
                  </div>
                )}
              </div>

              {/* Informative Summary for Selected Batch */}
              {activeBatch && (
                <div
                  style={{
                    padding: '10px 12px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '11.5px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Product:</span>
                    <strong style={{ color: 'var(--accent-cyan)' }}>
                      {activeBatch.productName} {activeBatch.productCode ? `(${activeBatch.productCode})` : ''}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Batch Availability:</span>
                    <span>
                      <strong style={{ color: 'var(--accent-emerald)' }}>
                        {Number(activeBatch.availableQty ?? activeBatch.qtyProduced ?? 0).toLocaleString()} Bags
                      </strong>{' '}
                      <span style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>
                        (Produced: {Number(activeBatch.qtyProduced || 0).toLocaleString()})
                      </span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Quality / Verification:</span>
                    <span className="badge badge-emerald" style={{ fontSize: '10px' }}>
                      {activeBatch.qualityStatus || 'Available'} · Pass
                    </span>
                  </div>
                </div>
              )}

              {/* Manual Batch ID Entry Field (Visible when 'custom' selected or no batches loaded) */}
              {(selectedBatchId === 'custom' || !selectedBatchId) && (
                <div
                  style={{
                    background: 'rgba(56, 189, 248, 0.04)',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div>
                    <label
                      htmlFor="custom-batch-id-input"
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                        marginBottom: '4px',
                        textTransform: 'uppercase',
                        fontFamily: 'var(--font-mono)'
                      }}
                    >
                      Enter Finished Batch ID *
                    </label>
                    <input
                      id="custom-batch-id-input"
                      type="number"
                      min="1"
                      step="1"
                      value={customBatchId}
                      onChange={(e) => handleCustomBatchIdChange(e.target.value)}
                      placeholder="Enter an existing Finished Batch ID (e.g. 1)"
                      className="form-control font-mono"
                      style={{
                        width: '100%',
                        fontSize: '13px',
                        borderColor: fieldError ? 'var(--accent-coral)' : 'var(--border-default)'
                      }}
                      required
                    />
                    {fieldError && (
                      <div style={{ color: 'var(--accent-coral)', fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={12} />
                        <span>{fieldError}</span>
                      </div>
                    )}
                  </div>

                  {/* Batch Code Lookup Helper */}
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Or lookup by Finished Batch Code:
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        value={batchCodeQuery}
                        onChange={(e) => setBatchCodeQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleBatchCodeLookup();
                          }
                        }}
                        placeholder="e.g. FB-2026-BAG-01"
                        className="form-control font-mono"
                        style={{ flex: 1, fontSize: '11.5px' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleBatchCodeLookup()}
                        disabled={lookingUpCode || !batchCodeQuery.trim()}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                      >
                        {lookingUpCode ? <RefreshCw size={12} className="spin" /> : <Search size={12} />}
                        <span>Lookup</span>
                      </button>
                    </div>

                    {/* Quick Seed Batch Helper Pills */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Quick Select:</span>
                      {[
                        { id: '1', code: 'FB-2026-BAG-01', label: 'FB-01 (50KG)' },
                        { id: '2', code: 'FB-2026-BAG-02', label: 'FB-02 (25KG)' },
                        { id: '3', code: 'FB-2026-BAG-03', label: 'FB-03 (FIBC)' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setCustomBatchId(item.id);
                            setBatchCodeQuery(item.code);
                            handleBatchCodeLookup(item.code);
                          }}
                          className="badge"
                          style={{
                            cursor: 'pointer',
                            background: customBatchId === item.id ? 'var(--accent-cyan)' : 'var(--bg-surface)',
                            color: customBatchId === item.id ? '#0f172a' : 'var(--text-secondary)',
                            border: '1px solid var(--border-subtle)',
                            fontSize: '10px'
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {lookupFeedback && (
                      <div
                        style={{
                          marginTop: '6px',
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-xs)',
                          fontSize: '11px',
                          background: lookupFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: lookupFeedback.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-coral)',
                          border: `1px solid ${lookupFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                        }}
                      >
                        {lookupFeedback.text}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Warehouse & Storage Bin Selection (Prefers Finished Goods compatible warehouses) */}
              <BinSelect
                selectedWarehouseId={warehouseId}
                value={binId}
                filterType="FG"
                onChange={(newBinId) => setBinId(newBinId)}
                onWarehouseChange={(newWhId, whObj) => {
                  setWarehouseId(newWhId);
                  if (whObj) setSelectedWarehouseObj(whObj);
                }}
                showWarehouseSelect={true}
                warehouseLabel="Target Warehouse (Finished Goods Compatible) *"
                binLabel="Target Bin / Staging Area (Optional)"
                required={false}
              />

              {/* Quantity in Bags */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Pallet Bag Capacity (Quantity) *
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    id="pallet-quantity-input"
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="form-control font-mono"
                    style={{ flex: 1, fontSize: '13px' }}
                    required
                  />
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[1000, 2000, 2500, 5000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setQuantity(preset)}
                        className={`btn btn-sm ${Number(quantity) === preset ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '4px 8px', fontSize: '10.5px' }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
                {activeBatch && activeBatch.availableQty !== undefined && Number(quantity) > Number(activeBatch.availableQty) && (
                  <div style={{ color: 'var(--accent-amber)', fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={12} />
                    <span>Warning: Requested {Number(quantity).toLocaleString()} bags exceeds currently available batch balance ({Number(activeBatch.availableQty).toLocaleString()} bags).</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  marginTop: '12px',
                  borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                  paddingTop: '14px'
                }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary btn-sm"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={submitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {submitting ? <RefreshCw size={13} className="spin" /> : <Barcode size={14} />}
                  <span>{submitting ? 'Generating Pallet...' : 'Generate Pallet & Barcode'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

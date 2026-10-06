import React, { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  Barcode,
  Sparkles,
  Copy,
  Check,
  Printer,
  ArrowRightLeft,
  RotateCcw,
  Download,
  Trash2,
  FileText,
  History,
  CheckCircle2,
  Boxes,
  Building2
} from 'lucide-react';
import { inventoryApi } from '../services/api';
import BarcodeVisual from './BarcodeVisual';
import QrCodeVisual from './QrCodeVisual';

export default function BarcodeGeneratorModal({
  isOpen,
  onClose,
  onOpenLabelModal,
  onOpenStockTransfer
}) {
  const [codeText, setCodeText] = useState('RM-PP-H030SG');
  const [previousCode, setPreviousCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [history, setHistory] = useState([
    'RM-PP-H030SG',
    'PAL-20261003-0AECBF95',
    'LOT-RIL-001-2026',
    'BIN-A1-04'
  ]);

  useEffect(() => {
    if (isOpen) {
      setLoadingMaterials(true);
      inventoryApi.getRawMaterials()
        .then(res => {
          const list = Array.isArray(res.data) ? res.data : [];
          setRawMaterials(list);
        })
        .catch(err => console.warn('Failed to load raw materials for barcode generator:', err))
        .finally(() => setLoadingMaterials(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Clear / Undo / Reset actions
  const handleClear = () => {
    if (codeText) {
      setPreviousCode(codeText);
    }
    setCodeText('');
    setCopied(false);
  };

  const handleUndo = () => {
    if (previousCode) {
      setCodeText(previousCode);
      setPreviousCode('');
    }
  };

  const handleGenerateRandom = (prefix = 'PAL') => {
    if (codeText) {
      setPreviousCode(codeText);
    }
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const newCode = `${prefix}-${new Date().getFullYear()}${randomNum}`;
    setCodeText(newCode);
    setHistory((prev) => [newCode, ...prev.filter(c => c !== newCode).slice(0, 4)]);
  };

  const handleSelectHistory = (item) => {
    if (codeText) {
      setPreviousCode(codeText);
    }
    setCodeText(item);
  };

  const handleCopy = () => {
    if (!codeText) return;
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLaunchTransfer = () => {
    if (!codeText.trim()) return;
    if (onOpenStockTransfer) {
      onOpenStockTransfer({
        palletCode: codeText.trim(),
        fromWarehouseId: 1,
        fromBinId: 1,
        quantity: 1000,
        type: 'GENERATED_UNIT'
      });
      onClose();
    }
  };

  const handleOpenPrint = () => {
    if (!codeText.trim()) return;
    if (onOpenLabelModal) {
      onOpenLabelModal({
        palletCode: codeText.trim(),
        barcode: codeText.trim(),
        sscc: codeText.trim(),
        quantity: 2500,
        productName: 'Custom Generated Inventory Label'
      });
      onClose();
    }
  };

  return (
    <div
      className="modal-backdrop"
      style={{ zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '720px',
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
        {/* Modal Dark Industrial Header */}
        <div
          style={{
            padding: '14px 20px',
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
                background: '#06B6D4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#082F49'
              }}
            >
              <QrCode size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>
                Barcode & 2D QR Generator Studio
              </h3>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                StockAI OS · Dynamic Vector 1D / 2D Symbology Encoder
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ color: '#94A3B8', padding: '6px' }}
            title="Close Generator"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body Container */}
        <div
          style={{
            padding: '18px 22px 24px 22px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* Top Generator Input with Reset/Undo actions */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                Data String / Identifier to Encode
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {previousCode && (
                  <button
                    type="button"
                    onClick={handleUndo}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '2px 8px', color: '#0284C7' }}
                    title="Undo to previous code"
                  >
                    <RotateCcw size={11} /> Undo
                  </button>
                )}
                {codeText && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '2px 8px', color: '#EF4444' }}
                    title="Clear generated code"
                  >
                    <Trash2 size={11} /> Clear Code
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="input font-mono"
                value={codeText}
                onChange={(e) => setCodeText(e.target.value)}
                placeholder="Type or generate string (e.g. RM-PP-H030SG, PAL-20261003-0AECBF95)..."
                style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '0.02em' }}
              />
              <button
                type="button"
                onClick={() => handleGenerateRandom('RM-LOT')}
                className="btn btn-primary"
                style={{ whiteSpace: 'nowrap' }}
              >
                <Sparkles size={14} /> Auto-Gen ID
              </button>
            </div>
          </div>

          {/* Live Inventory Raw Material Quick Picker */}
          {rawMaterials.length > 0 && (
            <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '8px', padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: '700', color: '#0369A1' }}>
                  <Boxes size={14} /> Select from Available Inventory Raw Materials:
                </div>
                <span style={{ fontSize: '10.5px', color: '#0284C7', fontWeight: '600' }}>
                  {rawMaterials.length} materials in stock
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {rawMaterials.slice(0, 6).map((m) => (
                  <button
                    key={m.materialId}
                    type="button"
                    onClick={() => {
                      if (codeText) setPreviousCode(codeText);
                      setCodeText(m.materialCode);
                      setSelectedMaterial(m);
                      setHistory(prev => [m.materialCode, ...prev.filter(c => c !== m.materialCode).slice(0, 4)]);
                    }}
                    className="btn btn-secondary btn-xs"
                    style={{
                      fontSize: '11px',
                      background: codeText === m.materialCode ? '#0284C7' : '#FFFFFF',
                      color: codeText === m.materialCode ? '#FFFFFF' : '#0F172A',
                      borderColor: codeText === m.materialCode ? '#0284C7' : '#CBD5E1',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    {m.materialCode} ({m.materialName.slice(0, 15)}...)
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preset Quick Encode Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Presets:</span>
            {[
              { label: 'Raw Resin Lot', prefix: 'RM-LOT' },
              { label: 'Pallet Unit', prefix: 'PAL' },
              { label: 'GS1 SSCC-18', prefix: '(00)3890123' },
              { label: 'Storage Bin', prefix: 'BIN-A1' },
              { label: 'Finished Bag SKU', prefix: 'SKU-BOPP' }
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleGenerateRandom(p.prefix)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px', padding: '2px 8px' }}
              >
                + {p.label}
              </button>
            ))}
          </div>

          {/* Generated Dual Code Output Card */}
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #BAE6FD',
              borderRadius: '10px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#0284C7" />
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Generated Vector Symbologies
                </span>
              </div>
              <div className="font-mono" style={{ fontSize: '12px', fontWeight: '700', color: '#0369A1' }}>
                {codeText || '(Empty Input)'}
              </div>
            </div>

            {/* Side-by-side Visual Representation */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '14px'
              }}
            >
              {/* 1D Linear Code-128 */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '16px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  minHeight: '130px'
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Linear Code-128 Barcode
                </div>
                {codeText ? (
                  <BarcodeVisual value={codeText} height={52} width={260} showText={true} />
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Enter text above to generate barcode
                  </span>
                )}
              </div>

              {/* 2D QR Code */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '16px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  minHeight: '130px'
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  2D Matrix QR Code
                </div>
                {codeText ? (
                  <QrCodeVisual value={codeText} size={96} />
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Enter text above to generate QR
                  </span>
                )}
              </div>
            </div>

            {/* Action CTAs */}
            <div
              style={{
                display: 'flex',
                gap: '10px',
                borderTop: '1px solid #E2E8F0',
                paddingTop: '14px',
                flexWrap: 'wrap'
              }}
            >
              <button
                type="button"
                onClick={handleLaunchTransfer}
                disabled={!codeText.trim()}
                className="btn btn-primary"
                style={{ flex: 1, minWidth: '220px', justifyContent: 'center' }}
              >
                <ArrowRightLeft size={14} /> Transfer This Batch Between Units
              </button>

              <button
                type="button"
                onClick={handleOpenPrint}
                disabled={!codeText.trim()}
                className="btn btn-secondary"
                style={{ minWidth: '150px', justifyContent: 'center' }}
              >
                <Printer size={14} color="#0284C7" /> Print 4"x6" Label
              </button>

              <button
                type="button"
                onClick={handleCopy}
                disabled={!codeText.trim()}
                className="btn btn-secondary"
                style={{ minWidth: '110px', justifyContent: 'center' }}
              >
                {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Recent History Stack */}
          {history.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <History size={13} color="var(--text-muted)" />
                <span style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                  Recently Generated Codes:
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {history.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleSelectHistory(item)}
                    className="btn btn-secondary btn-sm font-mono"
                    style={{
                      fontSize: '11.5px',
                      padding: '3px 10px',
                      background: codeText === item ? '#E0F2FE' : '#FFFFFF',
                      borderColor: codeText === item ? '#0284C7' : 'var(--border-default)',
                      color: codeText === item ? '#0369A1' : 'var(--text-primary)'
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 20px',
            background: '#F8FAFC',
            borderTop: '1px solid var(--border-default)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}
        >
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            Vector ISO/IEC 15417 & 18004 Compliant
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={handleClear} className="btn btn-secondary btn-sm" style={{ color: '#EF4444' }}>
              Clear / Reset
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
              Close Studio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

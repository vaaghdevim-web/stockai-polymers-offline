import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  CameraOff,
  Barcode,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Printer,
  RotateCcw,
  ArrowRightLeft,
  Volume2,
  Copy,
  Check,
  Zap,
  Package,
  Layers,
  MapPin
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { palletApi, warehouseApi, inventoryApi } from '../services/api';
import BarcodeVisual from './BarcodeVisual';
import QrCodeVisual from './QrCodeVisual';

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onOpenLabelModal,
  onOpenStockTransfer,
  onNavigate
}) {
  const [scanInput, setScanInput] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showCameraView, setShowCameraView] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [resultType, setResultType] = useState(null); // 'pallet' | 'batch' | 'bin' | 'generic'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  const scannerInstanceRef = useRef(null);
  const inputRef = useRef(null);

  // Synthesized audio feedback
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      console.warn('Audio feedback error:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setCameraError(null);
      setCopiedCode(false);
      setTimeout(() => inputRef.current?.focus(), 150);
      if (showCameraView) {
        startScannerCamera();
      }
    } else {
      stopScannerCamera();
    }
    return () => {
      stopScannerCamera();
    };
  }, [isOpen, showCameraView]);

  // Hardware Barcode Gun Keystroke buffer listener
  useEffect(() => {
    if (!isOpen) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          handleLookup(buffer.trim());
          buffer = '';
        }
      } else if (e.key.length === 1) {
        if (timeDiff > 120 && buffer.length > 0) {
          buffer = '';
        }
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Start Html5Qrcode Scanner
  const startScannerCamera = async () => {
    setCameraError(null);
    try {
      if (scannerInstanceRef.current) {
        try {
          await scannerInstanceRef.current.stop();
        } catch {}
      }

      const scannerElement = document.getElementById('barcode-scanner-viewport');
      if (!scannerElement) return;

      const html5QrCode = new Html5Qrcode('barcode-scanner-viewport', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A
        ],
        verbose: false
      });
      scannerInstanceRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 240, height: 120 },
        aspectRatio: 1.777778
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          if (decodedText) {
            playBeep();
            handleLookup(decodedText.trim());
          }
        },
        () => {}
      );

      setIsCameraActive(true);
    } catch (err) {
      console.warn('Html5Qrcode camera error:', err);
      setCameraError('Camera optical scan is unavailable or permissions were denied. You can still type, paste, or scan with a USB barcode gun.');
      setIsCameraActive(false);
    }
  };

  // Stop Html5Qrcode Scanner
  const stopScannerCamera = async () => {
    if (scannerInstanceRef.current) {
      try {
        if (scannerInstanceRef.current.isScanning) {
          await scannerInstanceRef.current.stop();
        }
        await scannerInstanceRef.current.clear();
      } catch (err) {
        console.warn('Scanner stop error:', err);
      }
      scannerInstanceRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Clear / Undo Scan State
  const handleResetScan = () => {
    setScanInput('');
    setScanResult(null);
    setResultType(null);
    setError(null);
    setCopiedCode(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Unified Lookup across Pallets, Batches, and Bins
  const handleLookup = async (codeToLookup) => {
    const query = (codeToLookup || scanInput).trim();
    if (!query) return;

    try {
      setLoading(true);
      setError(null);
      setScanResult(null);
      setResultType(null);

      // 1. Try Pallet API
      try {
        const palletRes = await palletApi.getPallet(query);
        if (palletRes.data && (palletRes.data.palletId || palletRes.data.palletCode || palletRes.data.palletIdentifier)) {
          setScanResult(palletRes.data);
          setResultType('pallet');
          playBeep();
          setLoading(false);
          return;
        }
      } catch (palletErr) {}

      // 2. Try Raw Material Batches
      try {
        const rawRes = await inventoryApi.getRawMaterials();
        const materials = Array.isArray(rawRes.data) ? rawRes.data : [];
        const matchedMat = materials.find(m => 
          (m.materialCode && m.materialCode.toLowerCase() === query.toLowerCase()) ||
          (m.materialName && m.materialName.toLowerCase().includes(query.toLowerCase()))
        );

        if (matchedMat) {
          const fifoRes = await inventoryApi.getFifoBatches(matchedMat.materialId);
          const batches = Array.isArray(fifoRes.data) ? fifoRes.data : [];
          const resultData = {
            material: matchedMat,
            batches: batches,
            batchCode: query
          };
          setScanResult(resultData);
          setResultType('batch');
          playBeep();
          setLoading(false);
          return;
        }
      } catch (rmErr) {}

      // 3. Try Storage Bins
      try {
        const binRes = await warehouseApi.getBinByCode(query);
        if (binRes.data && binRes.data.binId) {
          setScanResult(binRes.data);
          setResultType('bin');
          playBeep();
          setLoading(false);
          return;
        }
      } catch (binErr) {}

      // Fallback: Generic Decoded Barcode
      const fallbackResult = {
        code: query,
        scannedAt: new Date().toISOString(),
        status: 'IDENTIFIED',
        details: 'Decoded factory inventory barcode string.'
      };
      setScanResult(fallbackResult);
      setResultType('generic');
      playBeep();

    } catch (err) {
      setError(err.response?.data?.message || err.message || `No active inventory record found matching barcode '${query}'`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Launch transfer prefilled with scanned item
  const handleLaunchTransfer = (targetCode, targetResult) => {
    const res = targetResult || scanResult;
    const code = targetCode || scanInput;

    let prefill = {};
    if (resultType === 'pallet' || res?.palletCode || res?.palletIdentifier) {
      prefill = {
        palletCode: res?.palletCode || res?.palletIdentifier || code,
        sscc: res?.sscc,
        fromWarehouseId: res?.warehouseId || 1,
        fromBinId: res?.binId || 1,
        quantity: res?.quantity || res?.totalUnits || 1000,
        type: 'PALLET'
      };
    } else if (resultType === 'batch' || res?.material) {
      prefill = {
        materialId: res?.material?.materialId,
        materialCode: res?.material?.materialCode || code,
        batchId: res?.batches?.[0]?.batchId,
        fromWarehouseId: 1,
        quantity: res?.batches?.[0]?.availableWeightKg || 500,
        type: 'RAW_BATCH'
      };
    } else {
      prefill = {
        palletCode: code,
        fromWarehouseId: 1,
        fromBinId: 1,
        quantity: 500,
        type: 'GENERIC'
      };
    }

    if (onOpenStockTransfer) {
      onOpenStockTransfer(prefill);
      onClose();
    } else if (onNavigate) {
      onNavigate('raw-materials');
      onClose();
    }
  };

  if (!isOpen) return null;

  const currentCodeString = scanResult?.palletCode || scanResult?.barcode || scanResult?.code || scanResult?.material?.materialCode || scanResult?.binCode || scanInput;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1000 }}>
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
        {/* Fixed Modal Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#0B1117',
          color: '#FFFFFF',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: '#06B6D4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#082F49'
            }}>
              <Barcode size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>
                Live Barcode & QR Optical Scanner
              </h3>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                StockAI OS · Camera, Laser & USB Gun Decoder Unit
              </div>
            </div>
          </div>

          {/* Controls: Audio & Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="btn btn-ghost btn-sm"
              style={{ color: soundEnabled ? '#06B6D4' : '#64748B', padding: '6px' }}
              title={soundEnabled ? 'Mute Audio Beep' : 'Enable Audio Beep'}
            >
              <Volume2 size={16} />
            </button>

            <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ color: '#94A3B8', padding: '6px' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div style={{
          padding: '18px 22px 24px 22px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Camera Viewport with Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Camera Optical Viewfinder
            </span>
            <button
              type="button"
              onClick={() => setShowCameraView(!showCameraView)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '3px 9px' }}
            >
              {showCameraView ? <CameraOff size={13} /> : <Camera size={13} />}
              <span>{showCameraView ? 'Collapse Camera View' : 'Open Camera View'}</span>
            </button>
          </div>

          {showCameraView && (
            <div style={{
              position: 'relative',
              width: '100%',
              height: '180px',
              background: '#0D141C',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #1E293B'
            }}>
              <div id="barcode-scanner-viewport" style={{ width: '100%', height: '100%' }} />

              {/* Laser & Reticle Overlay */}
              <div style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '240px',
                  height: '110px',
                  border: '2px dashed rgba(6, 182, 212, 0.7)',
                  borderRadius: '6px',
                  position: 'relative'
                }}>
                  <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '14px', height: '14px', borderTop: '3px solid #06B6D4', borderLeft: '3px solid #06B6D4' }} />
                  <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '14px', height: '14px', borderTop: '3px solid #06B6D4', borderRight: '3px solid #06B6D4' }} />
                  <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '14px', height: '14px', borderBottom: '3px solid #06B6D4', borderLeft: '3px solid #06B6D4' }} />
                  <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '14px', height: '14px', borderBottom: '3px solid #06B6D4', borderRight: '3px solid #06B6D4' }} />

                  {isCameraActive && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      height: '2px',
                      background: '#EF4444',
                      boxShadow: '0 0 8px #EF4444',
                      animation: 'scanLaser 2s ease-in-out infinite alternate'
                    }} />
                  )}
                </div>

                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  background: 'rgba(11, 17, 23, 0.85)',
                  color: '#38BDF8',
                  fontSize: '10.5px',
                  fontWeight: '600',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(56, 189, 248, 0.3)'
                }}>
                  {isCameraActive ? 'ALIGN CODE INSIDE RETICLE' : 'SCANNER READY'}
                </div>
              </div>
            </div>
          )}

          <style>{`
            @keyframes scanLaser {
              0% { top: 5%; opacity: 0.8; }
              50% { opacity: 1; }
              100% { top: 95%; opacity: 0.8; }
            }
          `}</style>

          {cameraError && (
            <div style={{
              padding: '8px 12px',
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '6px',
              color: '#B45309',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={15} />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Code Search Input Form */}
          <form onSubmit={(e) => { e.preventDefault(); handleLookup(scanInput); }} style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Barcode size={16} color="#0284C7" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                ref={inputRef}
                type="text"
                className="input"
                placeholder="Scan with USB gun or type code (e.g. PAL-20261003-0AECBF95)..."
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                style={{ paddingLeft: '34px', fontSize: '13px' }}
              />
            </div>
            <button type="submit" disabled={loading || !scanInput.trim()} className="btn btn-primary">
              <Search size={14} /> {loading ? 'Decoding...' : 'Lookup Code'}
            </button>
            {(scanInput || scanResult) && (
              <button
                type="button"
                onClick={handleResetScan}
                className="btn btn-secondary"
                title="Clear and reset scan"
                style={{ color: 'var(--text-secondary)' }}
              >
                <RotateCcw size={14} /> Clear
              </button>
            )}
          </form>

          {/* Quick Simulator Test Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: '600' }}>Quick Test Chips:</span>
            {[
              { label: 'Pallet #4', code: 'PAL-20261003-0AECBF95' },
              { label: 'Barcode Gun', code: 'BC-5D7D6B362D0F4B17' },
              { label: 'PP Raffia Batch', code: 'RM-PP-1030RG-IOCL' },
              { label: 'Storage Bin A1', code: 'BIN-A1-01' }
            ].map((test) => (
              <button
                key={test.code}
                type="button"
                onClick={() => {
                  setScanInput(test.code);
                  handleLookup(test.code);
                }}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px', padding: '2px 8px' }}
              >
                <Zap size={11} color="#0284C7" /> {test.label}
              </button>
            ))}
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--accent-coral-light)',
              border: '1px solid var(--accent-coral-border)',
              borderRadius: '6px',
              color: 'var(--accent-coral-text)',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Scanned Decoded Result Card */}
          {scanResult && (
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #BAE6FD',
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={20} color="#0284C7" />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {resultType === 'pallet' && 'GS1 Pallet Unit Decoded'}
                      {resultType === 'batch' && 'Raw Material Batch Decoded'}
                      {resultType === 'bin' && 'Warehouse Bin Location Decoded'}
                      {resultType === 'generic' && 'Barcode Decoded'}
                    </div>
                    <div className="font-mono" style={{ fontSize: '12.5px', color: '#0369A1', fontWeight: '700' }}>
                      {currentCodeString}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => handleCopyCode(currentCodeString)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                  >
                    {copiedCode ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={handleResetScan}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '3px 8px', color: '#EF4444' }}
                    title="Undo / Clear this result"
                  >
                    <RotateCcw size={12} />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {/* Dual Barcode & QR Code Visual Representation */}
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                gap: '16px',
                flexWrap: 'wrap'
              }}>
                {/* Linear Code-128 */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                    1D Code-128 Barcode
                  </span>
                  <BarcodeVisual
                    value={currentCodeString}
                    height={46}
                    width={260}
                    showText={true}
                  />
                </div>

                {/* 2D QR Code */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                    2D QR Code
                  </span>
                  <QrCodeVisual
                    value={currentCodeString}
                    size={84}
                  />
                </div>
              </div>

              {/* Detailed Information Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', fontSize: '12px' }}>
                {scanResult.quantity && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Quantity / Units:</span>
                    <div className="font-mono" style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                      {Number(scanResult.quantity).toLocaleString()} units
                    </div>
                  </div>
                )}
                {scanResult.warehouseId && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Warehouse:</span>
                    <div style={{ fontWeight: '600' }}>Unit {scanResult.warehouseId} Finished Goods</div>
                  </div>
                )}
                {scanResult.binId && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Storage Bin:</span>
                    <div className="font-mono" style={{ fontWeight: '700', color: '#0284C7' }}>BIN-A1-0{scanResult.binId}</div>
                  </div>
                )}
                {scanResult.material && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Material Grade:</span>
                    <div style={{ fontWeight: '600' }}>{scanResult.material.materialName}</div>
                  </div>
                )}
              </div>

              {/* Fully Visible Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '10px',
                marginTop: '6px',
                borderTop: '1px solid #E2E8F0',
                paddingTop: '12px',
                flexWrap: 'wrap'
              }}>
                <button
                  type="button"
                  onClick={() => handleLaunchTransfer(currentCodeString, scanResult)}
                  className="btn btn-primary"
                  style={{ flex: 1, minWidth: '220px', justifyContent: 'center' }}
                >
                  <ArrowRightLeft size={14} /> Transfer Between Units / Warehouses
                </button>

                {onOpenLabelModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenLabelModal(scanResult);
                      onClose();
                    }}
                    className="btn btn-secondary"
                    style={{ minWidth: '160px', justifyContent: 'center' }}
                  >
                    <Printer size={14} color="#0284C7" /> Print 4"x6" Label
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 20px',
          background: '#F8FAFC',
          borderTop: '1px solid var(--border-default)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            Status: {isCameraActive ? 'Camera Active (15 FPS)' : 'Hardware Keyboard / Gun Ready'}
          </span>
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
}

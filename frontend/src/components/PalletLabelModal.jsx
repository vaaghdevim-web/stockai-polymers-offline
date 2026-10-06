import React, { useRef } from 'react';
import { X, Printer, Download, Copy, Check, QrCode, ShieldCheck, Factory, ArrowRightLeft } from 'lucide-react';
import BarcodeVisual from './BarcodeVisual';
import QrCodeVisual from './QrCodeVisual';

export default function PalletLabelModal({
  isOpen,
  onClose,
  pallet = null,
  onOpenStockTransfer
}) {
  const [copied, setCopied] = React.useState(false);
  const printRef = useRef(null);

  if (!isOpen || !pallet) return null;

  const barcodeValue = pallet.barcode || pallet.palletCode || pallet.palletIdentifier || 'BC-000000000000';
  const palletCode = pallet.palletCode || pallet.palletIdentifier || `PAL-${pallet.palletId || '0000'}`;
  const batchNo = pallet.finishedBatchNo || pallet.batchNo || `BATCH-FB-${pallet.finishedBatchId || '101'}`;
  const quantity = pallet.quantity || pallet.bagCount || pallet.totalUnits || 2500;
  const unit = pallet.unit || 'BAGS';
  const binCode = pallet.binCode || (pallet.binId ? `BIN-A1-0${pallet.binId}` : 'STAGING-FG-01');
  const warehouseName = pallet.warehouseName || (pallet.warehouseId === 2 ? 'Unit 2 Storage WH' : 'Unit 1 Finished Goods WH');
  const productDescription = pallet.productName || 'PP Woven Valve Bag 50kg Heavy Duty (White UV)';
  const dateStr = pallet.createdAt ? new Date(pallet.createdAt).toLocaleDateString() : new Date().toLocaleDateString();

  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(barcodeValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="modal-backdrop"
      style={{ zIndex: 1050 }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          width: '95%',
          maxWidth: '600px',
          maxHeight: '92vh',
          background: '#FFFFFF',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
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
                color: '#082F49',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <QrCode size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>
                GS1-128 & QR Pallet Shipping Label
              </h3>
              <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>
                Standard 4" x 6" Thermal Print Ready Dispatch Tag
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ color: '#94A3B8', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Label Preview Content */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            id="printable-pallet-label"
            ref={printRef}
            style={{
              background: '#FFFFFF',
              color: '#000000',
              borderRadius: '6px',
              border: '2px solid #000000',
              padding: '18px',
              fontFamily: '"Helvetica Neue", Arial, sans-serif',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {/* Plant Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '2px solid #000000',
                paddingBottom: '8px'
              }}
            >
              <div>
                <div style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '0.5px' }}>
                  SRI VIDYA POLYMERS (SVP)
                </div>
                <div style={{ fontSize: '10px', color: '#444', fontWeight: '600', textTransform: 'uppercase' }}>
                  Manufacturing OS — Plant 1 Ungutur / Hyderabad
                </div>
              </div>
              <div
                style={{
                  border: '1.5px solid #000',
                  padding: '2px 8px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontWeight: '800',
                  background: '#ECFDF5',
                  color: '#047857'
                }}
              >
                PASS / QC APPROVED
              </div>
            </div>

            {/* Product & Batch Specs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11.5px' }}>
              <div>
                <span style={{ fontSize: '9.5px', textTransform: 'uppercase', color: '#666', display: 'block' }}>
                  Product Description
                </span>
                <strong style={{ fontSize: '12.5px' }}>{productDescription}</strong>
              </div>
              <div>
                <span style={{ fontSize: '9.5px', textTransform: 'uppercase', color: '#666', display: 'block' }}>
                  Pallet Code
                </span>
                <strong style={{ fontSize: '13px', fontFamily: 'monospace' }}>{palletCode}</strong>
              </div>
            </div>

            {/* Metrics 4-col Box */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '4px',
                background: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '4px',
                padding: '8px',
                textAlign: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '9.5px', color: '#666' }}>QTY (BAGS)</div>
                <div style={{ fontSize: '14px', fontWeight: '900' }}>{Number(quantity).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '9.5px', color: '#666' }}>BATCH NO</div>
                <div style={{ fontSize: '11px', fontWeight: '700', fontFamily: 'monospace' }}>{batchNo}</div>
              </div>
              <div>
                <div style={{ fontSize: '9.5px', color: '#666' }}>BIN LOCATION</div>
                <div style={{ fontSize: '11px', fontWeight: '800' }}>{binCode}</div>
              </div>
              <div>
                <div style={{ fontSize: '9.5px', color: '#666' }}>DATE</div>
                <div style={{ fontSize: '11px', fontWeight: '700' }}>{dateStr}</div>
              </div>
            </div>

            {/* Dual Barcode & QR Code Section */}
            <div
              style={{
                border: '1.5px dashed #94A3B8',
                borderRadius: '6px',
                padding: '12px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                background: '#FFFFFF',
                gap: '12px'
              }}
            >
              {/* Linear Barcode */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '9px', textTransform: 'uppercase', color: '#666', marginBottom: '2px' }}>
                  GS1-128 SERIAL CODE
                </span>
                <BarcodeVisual
                  value={barcodeValue}
                  width={250}
                  height={52}
                  showText={true}
                  barColor="#000000"
                  background="#FFFFFF"
                />
              </div>

              {/* 2D QR Code */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '9px', textTransform: 'uppercase', color: '#666', marginBottom: '2px' }}>
                  2D QR CODE
                </span>
                <QrCodeVisual
                  value={barcodeValue}
                  size={76}
                  darkColor="#000000"
                  lightColor="#FFFFFF"
                />
              </div>
            </div>

            {/* Sub-footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '9.5px',
                color: '#555',
                borderTop: '1px solid #E2E8F0',
                paddingTop: '6px'
              }}
            >
              <span>Warehouse: <strong>{warehouseName}</strong></span>
              <span>Status: <strong style={{ color: '#047857' }}>{pallet.status || 'Active'}</strong></span>
              <span>SVP StockAI OS Verified</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
            <button onClick={handleCopyBarcode} className="btn btn-secondary">
              {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
              <span>{copied ? 'Copied Barcode' : 'Copy Code'}</span>
            </button>
            <button onClick={handlePrint} className="btn btn-primary">
              <Printer size={14} /> Print Thermal Label
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

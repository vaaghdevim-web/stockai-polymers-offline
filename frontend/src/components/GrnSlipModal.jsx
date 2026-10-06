import React from 'react';
import { X, Printer, Package, ShieldCheck, Calendar, Building2, Layers, CheckCircle2 } from 'lucide-react';
import BarcodeVisual from './BarcodeVisual';
import { formatPlantName } from '../utils/brand';

export default function GrnSlipModal({ isOpen, onClose, batch, material }) {
  if (!isOpen || !batch) return null;

  const handlePrint = () => {
    window.print();
  };

  const grnNumber = `GRN-${batch.batchNumber || `BAT-${batch.batchId || '101'}`}`;
  const inwardDate = batch.receivedAt ? new Date(batch.receivedAt).toLocaleString() : new Date().toLocaleString();
  const quantity = Number(batch.quantityRemaining || batch.initialQuantity || 0).toLocaleString();
  const uom = material?.defaultUomCode || batch.uom || 'KG';

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1050 }}>
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
          background: 'var(--bg-panel)'
        }}
      >
        {/* Modal Header */}
        <div
          className="no-print"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-surface)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={18} color="var(--accent-cyan)" />
            </div>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                Goods Receipt Note (GRN) Inward Slip
              </h2>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                Raw Material Inward Intake & Quality Clearance Voucher
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handlePrint}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
            >
              <Printer size={14} /> Print GRN
            </button>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm"
              style={{ padding: '6px' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div
            id="printable-grn-slip"
            style={{
              background: '#FFFFFF',
              color: '#0F172A',
              padding: '28px',
              borderRadius: '8px',
              border: '2px solid #E2E8F0',
              fontFamily: 'Inter, system-ui, sans-serif'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0284C7', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', background: '#0284C7', borderRadius: '2px' }} />
                  <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#0F172A', margin: 0, letterSpacing: '-0.5px' }}>
                    SRI VIDHYA POLYMERS
                  </h1>
                </div>
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px', fontWeight: '500' }}>
                  Raw Materials Stores & Inward Quality Assurance Division
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
                  Unit 1 · Gummidipoondi Industrial Complex · Tamil Nadu
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'inline-block', background: '#E0F2FE', color: '#0369A1', padding: '4px 10px', borderRadius: '4px', fontWeight: '800', fontSize: '11px', letterSpacing: '0.5px' }}>
                  GOODS RECEIPT NOTE (GRN)
                </div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A', marginTop: '6px', fontFamily: 'monospace' }}>
                  {grnNumber}
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
                  Inward Date: {inwardDate}
                </div>
              </div>
            </div>

            {/* Barcode Strip */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '12px 16px', borderRadius: '6px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Material Intake Batch</div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0284C7', fontFamily: 'monospace' }}>
                  {batch.batchNumber || `BAT-${batch.batchId}`}
                </div>
                <div style={{ fontSize: '10.5px', color: '#475569', marginTop: '2px' }}>
                  Supplier Lot: <strong style={{ fontFamily: 'monospace' }}>{batch.supplierLotNumber || 'LOT-2026-X'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <BarcodeVisual value={batch.batchNumber || `BAT-${batch.batchId}`} format="CODE128" width={1.3} height={32} displayValue={false} />
                <span style={{ fontSize: '9px', color: '#64748B', fontFamily: 'monospace', marginTop: '2px' }}>{batch.batchNumber || `BAT-${batch.batchId}`}</span>
              </div>
            </div>

            {/* Material & Inspection Specifications */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '14px', background: '#FFFFFF' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#0369A1', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Material Particulars
                </div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>
                  {material?.materialName || batch.materialName || 'Polymer Resin'}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px', fontFamily: 'monospace' }}>
                  Item Code: {material?.materialCode || batch.materialCode || 'RM-POLY-01'}
                </div>
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '6px' }}>
                  Category: <strong>{material?.category || 'POLYMER_RESIN'}</strong>
                </div>
              </div>

              <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '14px', background: '#FFFFFF' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#0369A1', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Storage & Quality Status
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#64748B' }}>Storage Location:</span>
                  <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{batch.location || 'Silo Storage / Bay 1'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#64748B' }}>Inward QC Status:</span>
                  <strong style={{ color: batch.qcStatus === 'REJECTED' ? '#DC2626' : '#059669' }}>
                    {batch.qcStatus || 'PASSED'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#64748B' }}>Net Quantity:</span>
                  <strong style={{ color: '#0284C7', fontSize: '13px' }}>{quantity} {uom}</strong>
                </div>
              </div>
            </div>

            {/* Inward Sign-off */}
            <div style={{ marginTop: '32px', borderTop: '1px solid #E2E8F0', paddingTop: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', textAlign: 'center' }}>
                <div>
                  <div style={{ height: '36px', borderBottom: '1px solid #94A3B8' }} />
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#334155', marginTop: '6px' }}>Unloading Storekeeper</div>
                  <div style={{ fontSize: '9.5px', color: '#64748B' }}>Physical Weight Verified</div>
                </div>

                <div>
                  <div style={{ height: '36px', borderBottom: '1px solid #94A3B8' }} />
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#334155', marginTop: '6px' }}>QC Lab Chemist</div>
                  <div style={{ fontSize: '9.5px', color: '#64748B' }}>Sample Tested & Approved</div>
                </div>

                <div>
                  <div style={{ height: '36px', borderBottom: '1px solid #94A3B8' }} />
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#334155', marginTop: '6px' }}>Plant Store Incharge</div>
                  <div style={{ fontSize: '9.5px', color: '#64748B' }}>Bin Allocation Authorized</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

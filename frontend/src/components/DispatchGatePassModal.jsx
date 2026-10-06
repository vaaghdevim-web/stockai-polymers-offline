import React from 'react';
import { X, Printer, Truck, ShieldCheck, User, Calendar, MapPin, Package, FileText, CheckCircle2 } from 'lucide-react';
import BarcodeVisual from './BarcodeVisual';
import { formatPlantName } from '../utils/brand';

export default function DispatchGatePassModal({ isOpen, onClose, dispatch }) {
  if (!isOpen || !dispatch) return null;

  const handlePrint = () => {
    window.print();
  };

  const dispatchNumber = dispatch.dispatchNumber || `DSP-${String(dispatch.dispatchId).padStart(6, '0')}`;
  const gatePassNumber = `GP-${new Date().getFullYear()}-${String(dispatch.dispatchId).padStart(5, '0')}`;
  const currentDate = dispatch.dispatchedAt ? new Date(dispatch.dispatchedAt).toLocaleString() : new Date().toLocaleString();

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1050 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '780px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          background: 'var(--bg-panel)'
        }}
      >
        {/* Modal Top Bar (Hidden during print) */}
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
              <Truck size={18} color="var(--accent-cyan)" />
            </div>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                Official Transport Waybill & Security Gate Pass
              </h2>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                Factory Outward Movement Authorization Slip
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handlePrint}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
            >
              <Printer size={14} /> Print Gate Pass
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

        {/* Scrollable Printable Document Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div
            id="printable-gate-pass"
            style={{
              background: '#FFFFFF',
              color: '#0F172A',
              padding: '28px',
              borderRadius: '8px',
              border: '2px solid #E2E8F0',
              fontFamily: 'Inter, system-ui, sans-serif'
            }}
          >
            {/* Document Header with Company Branding */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0284C7', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', background: '#0284C7', borderRadius: '2px' }} />
                  <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#0F172A', margin: 0, letterSpacing: '-0.5px' }}>
                    SRI VIDHYA POLYMERS
                  </h1>
                </div>
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px', fontWeight: '500' }}>
                  High Density Polyethylene (HDPE) & Woven Sacks Manufacturing Unit
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
                  SIPCOT Industrial Complex, Gummidipoondi, Tamil Nadu 601201 · GSTIN: 33AAACS1234F1Z5
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'inline-block', background: '#E0F2FE', color: '#0369A1', padding: '4px 10px', borderRadius: '4px', fontWeight: '800', fontSize: '11px', letterSpacing: '0.5px' }}>
                  FACTORY OUTWARD GATE PASS
                </div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A', marginTop: '6px', fontFamily: 'monospace' }}>
                  {gatePassNumber}
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
                  Date: {currentDate}
                </div>
              </div>
            </div>

            {/* Barcode & Summary Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '12px 16px', borderRadius: '6px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Dispatch Reference</div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0284C7', fontFamily: 'monospace' }}>{dispatchNumber}</div>
                <div style={{ fontSize: '10.5px', color: '#475569', marginTop: '2px' }}>
                  Status: <strong style={{ color: '#059669' }}>{dispatch.status || 'OUTWARD_AUTHORIZED'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <BarcodeVisual value={dispatchNumber} format="CODE128" width={1.4} height={36} displayValue={false} />
                <span style={{ fontSize: '9px', color: '#64748B', fontFamily: 'monospace', marginTop: '2px' }}>{dispatchNumber}</span>
              </div>
            </div>

            {/* 2-Column Meta Matrix */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              {/* Left Column: Consignee & Destination */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '14px', background: '#FFFFFF' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#0369A1', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={13} /> Consignee & Destination
                </div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>
                  {dispatch.customerName || 'Standard Client Consignee'}
                </div>
                <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '4px', lineHeight: '1.4' }}>
                  {dispatch.destination || 'Industrial Delivery Hub'}
                </div>
                {dispatch.orderId && (
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '6px', fontFamily: 'monospace' }}>
                    Sales Order ID: <strong>#{dispatch.orderId}</strong>
                  </div>
                )}
              </div>

              {/* Right Column: Transport & Vehicle Details */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '14px', background: '#FFFFFF' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#0369A1', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Truck size={13} /> Vehicle & Driver Info
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#64748B' }}>Vehicle Reg. No:</span>
                  <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{dispatch.vehicleNumber || 'TN-05-AB-1234'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#64748B' }}>Driver Name:</span>
                  <strong style={{ color: '#0F172A' }}>{dispatch.driverName || 'Designated Fleet Driver'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#64748B' }}>Driver Phone:</span>
                  <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{dispatch.driverPhone || '+91 98400 12345'}</strong>
                </div>
              </div>
            </div>

            {/* Cargo Material Table */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1' }}>
                    <th style={{ padding: '8px 12px', fontWeight: '700', color: '#475569' }}>#</th>
                    <th style={{ padding: '8px 12px', fontWeight: '700', color: '#475569' }}>Description of Finished Goods</th>
                    <th style={{ padding: '8px 12px', fontWeight: '700', color: '#475569' }}>Packaging / Unit</th>
                    <th style={{ padding: '8px 12px', fontWeight: '700', color: '#475569', textAlign: 'right' }}>Net Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '10px 12px', color: '#64748B' }}>1</td>
                    <td style={{ padding: '10px 12px' }}>
                      <strong style={{ color: '#0F172A' }}>HDPE Laminated Woven Sacks / Fabric Rolls</strong>
                      <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
                        Tariff Heading (HSN): 63053300 · Factory Standard Export Quality
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#475569' }}>Standard Palletized Loads</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '800', color: '#0F172A' }}>
                      {dispatch.quantityTonnes ? `${Number(dispatch.quantityTonnes).toFixed(2)} MT` : '18.00 MT'}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style={{ background: '#F8FAFC', fontWeight: '800' }}>
                    <td colSpan={3} style={{ padding: '10px 12px', textAlign: 'right', color: '#334155' }}>Total Outward Net Tonnage:</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0284C7', fontSize: '13px' }}>
                      {dispatch.quantityTonnes ? `${Number(dispatch.quantityTonnes).toFixed(2)} Metric Tonnes` : '18.00 Metric Tonnes'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Notes & Special Instructions */}
            {dispatch.notes && (
              <div style={{ padding: '10px 14px', background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '6px', fontSize: '11px', color: '#475569', marginBottom: '20px' }}>
                <strong>Dispatch Notes / Waybill Remarks:</strong> {dispatch.notes}
              </div>
            )}

            {/* Security Declarations & Signatures Section */}
            <div style={{ marginTop: '28px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
              <div style={{ fontSize: '10px', color: '#64748B', marginBottom: '24px', lineHeight: '1.4' }}>
                <strong>Security Declaration:</strong> Verified that the vehicle physical seals, container weights, and pallet counts match the authorized dispatch schedule. Materials are issued in good order from Sri Vidhya Polymers manufacturing facility.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '100%', height: '40px', borderBottom: '1px solid #94A3B8' }} />
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#334155', marginTop: '6px' }}>Warehouse Storekeeper</span>
                  <span style={{ fontSize: '9.5px', color: '#64748B' }}>({dispatch.createdByUserName || 'Authorized Issuer'})</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '100%', height: '40px', borderBottom: '1px solid #94A3B8' }} />
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#334155', marginTop: '6px' }}>Security Gate Officer</span>
                  <span style={{ fontSize: '9.5px', color: '#64748B' }}>Time & Seal Checked</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '100%', height: '40px', borderBottom: '1px solid #94A3B8' }} />
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#334155', marginTop: '6px' }}>Transport Driver</span>
                  <span style={{ fontSize: '9.5px', color: '#64748B' }}>Received in Good Condition</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

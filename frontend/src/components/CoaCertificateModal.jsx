import React from 'react';
import { X, Printer, ShieldCheck, Award, AlertTriangle, CheckCircle } from 'lucide-react';

export default function CoaCertificateModal({ isOpen, onClose, inspection }) {
  if (!isOpen || !inspection) return null;

  const handlePrint = () => {
    window.print();
  };

  const items = Array.isArray(inspection.items) ? inspection.items : [];
  const isPassed = inspection.status === 'PASSED' || inspection.status === 'APPROVED';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px', padding: '24px', background: '#0D1117' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-default)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={20} color={isPassed ? 'var(--accent-emerald)' : 'var(--accent-coral)'} />
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Certificate of Analysis (CoA)
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handlePrint} className="btn btn-primary btn-sm">
              <Printer size={13} /> Print CoA
            </button>
            <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Certificate Body */}
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <div>
              <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-primary)' }}>SRI VIDHYA POLYMERS PRIVATE LIMITED</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Analytical Testing & Quality Assurance Division · Unit 1</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="font-mono" style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: '700' }}>Inspection #{inspection.inspectionId}</div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Date: {inspection.inspectionDate ? new Date(inspection.inspectionDate).toLocaleDateString() : 'Active'}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Batch / Run: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{inspection.materialBatchNo || inspection.finishedBatchNo || inspection.productionRunNumber || 'BATCH-RUN'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Inspection Type: </span>
              <span className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>{inspection.inspectionType || 'Final Quality'}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Overall Status: </span>
              <span className={`badge ${isPassed ? 'badge-emerald' : 'badge-coral'}`}>
                {inspection.status || 'PASSED'}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Remarks: </span>
              <span style={{ color: 'var(--text-secondary)' }}>{inspection.remarks || 'Standard testing protocol compliant.'}</span>
            </div>
          </div>

          <table className="data-table" style={{ fontSize: '11.5px', marginTop: '6px' }}>
            <thead>
              <tr>
                <th>Test Parameter</th>
                <th>Observed Value</th>
                <th>Tolerance Limits</th>
                <th>Critical</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const itemPassed = item.result === 'PASS' || item.result === 'PASSED' || item.result === null;
                const min = item.minimumValue != null ? item.minimumValue : '—';
                const max = item.maximumValue != null ? item.maximumValue : '—';

                return (
                  <tr key={idx}>
                    <td>
                      <span style={{ fontWeight: '600' }}>{item.parameterName || item.specification || 'Parameter'}</span>
                    </td>
                    <td className="font-mono" style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {item.observedValue != null ? `${item.observedValue} ${item.measurementUnit || ''}` : '—'}
                    </td>
                    <td className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {min !== '—' || max !== '—' ? `[${min} - ${max}] ${item.measurementUnit || ''}` : 'Standard'}
                    </td>
                    <td>
                      {item.isCritical ? (
                        <span style={{ fontSize: '10px', color: 'var(--accent-coral)', fontWeight: '700' }}>CRITICAL</span>
                      ) : (
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Standard</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${itemPassed ? 'badge-emerald' : 'badge-coral'}`}>
                        {item.result || (itemPassed ? 'PASS' : 'FAIL')}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>
                    No granular parameter metrics recorded for this inspection record.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Certified QA Signatory</div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>{inspection.inspectedByUserName || 'QA Lead'}</div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: isPassed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${isPassed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: 'var(--radius-xs)',
              fontSize: '11px',
              color: isPassed ? 'var(--accent-emerald)' : 'var(--accent-coral)',
              fontFamily: 'var(--font-mono)'
            }}>
              {isPassed ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
              <span>{isPassed ? 'OFFICIAL QA CERTIFICATE ISSUED' : 'INSPECTION FAILED - REJECTED'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

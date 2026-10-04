import React, { useState, useEffect } from 'react';
import { X, GitBranch, ArrowDown, Boxes, Factory, FlaskConical, Truck, AlertCircle, CheckCircle2, ChevronRight, Layers, FileCheck } from 'lucide-react';
import { qualityApi } from '../services/api';

function TreeNode({ node, depth = 0 }) {
  if (!node) return null;

  const nodeTypeIcons = {
    RAW_MATERIAL: <Boxes size={14} color="var(--accent-cyan)" />,
    COMPOUNDING_BATCH: <Factory size={14} color="var(--accent-amber)" />,
    FINISHED_PRODUCT: <Layers size={14} color="var(--accent-emerald)" />,
    DISPATCH: <Truck size={14} color="var(--accent-cyan)" />,
  };

  const icon = nodeTypeIcons[node.nodeType] || <GitBranch size={14} color="var(--accent-cyan)" />;

  return (
    <div style={{ marginLeft: depth > 0 ? '16px' : '0', marginTop: '8px' }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        padding: '10px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon}
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {node.name || node.identifier || 'Trace Node'}
              <span className="font-mono" style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginLeft: '6px' }}>
                ({node.identifier})
              </span>
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
              Type: {node.nodeType || 'N/A'} {node.quantity ? `· Qty: ${node.quantity} ${node.uom || 'KG'}` : ''}
              {node.timestamp ? ` · ${new Date(node.timestamp).toLocaleString()}` : ''}
            </div>
          </div>
        </div>
        {node.status && (
          <span className="badge badge-emerald" style={{ fontSize: '10px' }}>
            {node.status}
          </span>
        )}
      </div>

      {Array.isArray(node.children) && node.children.length > 0 && (
        <div style={{ borderLeft: '2px dashed var(--border-default)', marginLeft: '12px', paddingLeft: '8px' }}>
          {node.children.map((child, idx) => (
            <TreeNode key={idx} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function BatchGenealogyModal({ isOpen, onClose, batchCode = 'BATCH-2026-09-044' }) {
  const [genealogy, setGenealogy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && batchCode) {
      setLoading(true);
      setError(null);
      qualityApi.getGenealogy(batchCode)
        .then(res => {
          setGenealogy(res.data);
        })
        .catch(err => {
          setError(err.response?.data?.message || err.message || 'Genealogy records unavailable for target identifier.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, batchCode]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitBranch size={18} color="var(--accent-cyan)" />
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Universal Batch Genealogy & Traceability Explorer
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Provenance & Batch Tree for <span className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{batchCode}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '12px' }}>
              Resolving universal batch genealogy from PostgreSQL ledger...
            </div>
          )}

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
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {genealogy?.narrativeSummary && (
            <div style={{
              padding: '12px 14px',
              background: 'rgba(0, 210, 255, 0.08)',
              border: '1px solid rgba(0, 210, 255, 0.25)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <CheckCircle2 size={16} color="var(--accent-cyan)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: 'var(--accent-cyan)' }}>Traceability Narrative:</strong> {genealogy.narrativeSummary}
              </div>
            </div>
          )}

          {/* Root Node Hierarchy Tree */}
          {genealogy?.rootNode ? (
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.04em' }}>
                Batch Provenance Hierarchy
              </div>
              <TreeNode node={genealogy.rootNode} />
            </div>
          ) : !loading && !error && (
            /* Fallback Pipeline View if node tree is flat */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Upstream Raw Materials */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                  <Boxes size={14} />
                  <span>1. Upstream Supplier Raw Materials & Additives</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11.5px', fontWeight: '600' }}>Virgin Polymer Resin</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Target Batch: {batchCode}</div>
                  </div>
                  <div style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11.5px', fontWeight: '600' }}>Stabilizers & Masterbatch</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Lot Verified · Inward Ingestion</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <ArrowDown size={16} color="var(--border-strong)" />
              </div>

              {/* Compounding Run */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>
                  <Factory size={14} />
                  <span>2. Factory Compounding & Extrusion Line</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '600' }}>Batch Identifier: {batchCode}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {genealogy?.itemName ? `Item: ${genealogy.itemName}` : 'Twin-Screw Compounding Operation'}
                    </div>
                  </div>
                  <span className="badge badge-emerald">PROCESSED</span>
                </div>
              </div>
            </div>
          )}

          {/* Related QC Inspections */}
          {Array.isArray(genealogy?.relatedInspections) && genealogy.relatedInspections.length > 0 && (
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
                <FileCheck size={14} />
                <span>Associated QC Lab Inspections ({genealogy.relatedInspections.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {genealogy.relatedInspections.map((insp, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '8px 10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', fontSize: '11.5px' }}>
                    <div>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {insp.inspectionType || insp.type || `Inspection #${insp.inspectionId || idx + 1}`}
                      </span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>
                        {insp.inspectionDate ? new Date(insp.inspectionDate).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <span className={`badge ${insp.status === 'PASSED' || insp.status === 'APPROVED' ? 'badge-emerald' : 'badge-coral'}`}>
                      {insp.status || 'VERIFIED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-default)', background: 'var(--bg-card)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Close Genealogy Explorer
          </button>
        </div>
      </div>
    </div>
  );
}

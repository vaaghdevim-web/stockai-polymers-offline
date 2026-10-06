import React, { useState, useEffect } from 'react';
import { 
  X, 
  GitBranch, 
  Search, 
  Layers, 
  Box, 
  Truck, 
  ShieldCheck, 
  Factory, 
  Sparkles, 
  ChevronRight, 
  ArrowRight, 
  ArrowLeft, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  Calendar, 
  User, 
  FileText,
  BadgePercent,
  Check,
  PackageCheck
} from 'lucide-react';
import { getGenealogy } from '../services/domain/traceabilityService';

export default function BatchGenealogyModal({ isOpen, onClose, initialBatchId = '', batchCode = '', batchNumber = '' }) {
  const targetId = initialBatchId || batchCode || batchNumber || '';
  const [searchInput, setSearchInput] = useState(targetId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [traceData, setTraceData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const activeId = initialBatchId || batchCode || batchNumber || '';
      if (activeId) {
        setSearchInput(activeId);
        fetchGenealogy(activeId);
      } else if (!traceData) {
        setSearchInput('FB-2026-BAG-01');
        fetchGenealogy('FB-2026-BAG-01');
      }
    }
  }, [isOpen, initialBatchId, batchCode, batchNumber]);

  const fetchGenealogy = async (batchId) => {
    if (!batchId || !batchId.trim()) return;
    setLoading(true);
    setError(null);
    setSelectedNode(null);
    try {
      const res = await getGenealogy(batchId.trim());
      if (res?.data) {
        setTraceData(res.data);
        if (res.data.rootNode) {
          setSelectedNode(res.data.rootNode);
        }
      }
    } catch (err) {
      console.error('Failed to load batch genealogy:', err);
      setError(err?.response?.data?.message || 'Failed to fetch traceability tree for this batch identifier.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchGenealogy(searchInput);
  };

  const getNodeIcon = (nodeType) => {
    switch (nodeType?.toUpperCase()) {
      case 'RAW_MATERIAL_LOT':
      case 'RAW_MATERIAL':
        return <Layers size={16} color="#0284C7" />;
      case 'COMPOUNDING_BATCH':
      case 'COMPOUNDING':
        return <Sparkles size={16} color="#8B5CF6" />;
      case 'PRODUCTION_RUN':
      case 'EXTRUSION':
      case 'WEAVING':
        return <Factory size={16} color="#F59E0B" />;
      case 'FINISHED_GOODS':
      case 'FINISHED_PRODUCT':
        return <Box size={16} color="#10B981" />;
      case 'PALLET':
        return <PackageCheck size={16} color="#0D9488" />;
      case 'DISPATCH':
      case 'SHIPMENT':
        return <Truck size={16} color="#EC4899" />;
      default:
        return <GitBranch size={16} color="var(--text-secondary)" />;
    }
  };

  const getNodeBadgeColor = (nodeType) => {
    switch (nodeType?.toUpperCase()) {
      case 'RAW_MATERIAL_LOT':
      case 'RAW_MATERIAL':
        return { bg: '#E0F2FE', text: '#0284C7', border: '#BAE6FD' };
      case 'COMPOUNDING_BATCH':
      case 'COMPOUNDING':
        return { bg: '#F3E8FF', text: '#7C3AED', border: '#DDD6FE' };
      case 'PRODUCTION_RUN':
      case 'EXTRUSION':
        return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
      case 'FINISHED_GOODS':
        return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
      case 'PALLET':
        return { bg: '#CCFBF1', text: '#0F766E', border: '#99F6E4' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
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
        backdropFilter: 'blur(5px)',
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
          maxWidth: '1000px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border-default)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh'
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
              background: '#E0F2FE',
              color: '#0284C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <GitBranch size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Polymer Batch Genealogy & Traceability Engine
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Bidirectional forward & backward lineage linking Raw Lots $\to$ Compounding $\to$ Extrusion $\to$ Finished Goods $\to$ Pallets
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

        {/* Search Bar & Sample Presets */}
        <div style={{
          padding: '14px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          background: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          flexWrap: 'wrap'
        }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '280px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter Raw Lot (e.g. LOT-RIL-001, RM-2026-001) or Finished Batch (e.g. FB-2026-BAG-01)..."
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-default)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'var(--font-mono)'
                }}
              />
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                fontSize: '13px',
                padding: '8px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#0284C7',
                borderColor: '#0284C7'
              }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>{loading ? 'Tracing...' : 'Trace Genealogy'}</span>
            </button>
          </form>

          {/* Quick Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Try:</span>
            <button
              type="button"
              onClick={() => { setSearchInput('FB-2026-BAG-01'); fetchGenealogy('FB-2026-BAG-01'); }}
              style={{
                background: '#F1F5F9',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11.5px',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                color: '#0284C7',
                fontWeight: '600'
              }}
            >
              FB-2026-BAG-01 (FG)
            </button>
            <button
              type="button"
              onClick={() => { setSearchInput('RM-2026-001'); fetchGenealogy('RM-2026-001'); }}
              style={{
                background: '#F1F5F9',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11.5px',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                color: '#0284C7',
                fontWeight: '600'
              }}
            >
              RM-2026-001 (Raw)
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Error Banner */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              color: '#B91C1C',
              fontSize: '13px'
            }}>
              <AlertCircle size={17} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Narrative Summary Bar */}
          {traceData?.narrativeSummary && (
            <div style={{
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '10px',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <CheckCircle2 size={18} color="#16A34A" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#15803D', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  {traceData.traceabilityDirection} Traceability Audit Passed
                </div>
                <div style={{ fontSize: '13px', color: '#166534', marginTop: '2px', lineHeight: 1.5 }}>
                  {traceData.narrativeSummary}
                </div>
              </div>
            </div>
          )}

          {/* Split View: Tree Nodes on Left, Selected Node Inspector on Right */}
          {traceData?.rootNode && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '18px', alignItems: 'start' }}>
              {/* Left Column: Interactive Genealogy Tree */}
              <div style={{
                background: '#F8FAFC',
                border: '1px solid var(--border-default)',
                borderRadius: '10px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={16} color="#0284C7" />
                  <span>Lineage Hierarchy Flow</span>
                </div>

                {/* Recursive Node Render */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <TreeNodeCard 
                    node={traceData.rootNode} 
                    depth={0}
                    selectedNode={selectedNode}
                    onSelectNode={setSelectedNode}
                    getNodeIcon={getNodeIcon}
                    getNodeBadgeColor={getNodeBadgeColor}
                  />
                </div>
              </div>

              {/* Right Column: Node Details Inspector & Quality Certifications */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Selected Node Details Card */}
                {selectedNode ? (
                  <div style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--border-default)',
                    borderRadius: '10px',
                    padding: '18px',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      paddingBottom: '12px',
                      borderBottom: '1px solid var(--border-subtle)'
                    }}>
                      {getNodeIcon(selectedNode.nodeType)}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                          {selectedNode.nodeType?.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {selectedNode.identifier}
                        </div>
                      </div>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        fontFamily: 'var(--font-mono)',
                        background: selectedNode.status === 'Available' || selectedNode.status === 'Completed' || selectedNode.status === 'Pass' ? '#DCFCE7' : '#FEF3C7',
                        color: selectedNode.status === 'Available' || selectedNode.status === 'Completed' || selectedNode.status === 'Pass' ? '#15803D' : '#B45309'
                      }}>
                        {selectedNode.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px', fontSize: '12.5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Material / Name:</span>
                        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{selectedNode.name}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Recorded Quantity:</span>
                        <span style={{ fontWeight: '700', fontFamily: 'var(--font-mono)', color: '#0284C7' }}>
                          {Number(selectedNode.quantity || 0).toLocaleString()} {selectedNode.uom}
                        </span>
                      </div>

                      {selectedNode.timestamp && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Timestamp:</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                            {selectedNode.timestamp.slice(0, 19).replace('T', ' ')}
                          </span>
                        </div>
                      )}

                      {/* Custom Key-Value Details */}
                      {selectedNode.details && Object.keys(selectedNode.details).length > 0 && (
                        <div style={{ marginTop: '6px', paddingTop: '10px', borderTop: '1px dashed var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            Manufacturing & Supplier Metadata
                          </div>
                          {Object.entries(selectedNode.details).map(([key, val]) => (
                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                              <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                              </span>
                              <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontFamily: typeof val === 'number' ? 'var(--font-mono)' : 'inherit' }}>
                                {String(val)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: '#F8FAFC',
                    border: '1px dashed var(--border-default)',
                    borderRadius: '10px',
                    padding: '24px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '13px'
                  }}>
                    Select any node from the tree on the left to inspect its detailed manufacturing parameters and quality metrics.
                  </div>
                )}

                {/* QC Inspection Verdicts Card */}
                {traceData.relatedInspections && traceData.relatedInspections.length > 0 && (
                  <div style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--border-default)',
                    borderRadius: '10px',
                    padding: '16px',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <ShieldCheck size={16} color="#059669" />
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        Quality Certifications ({traceData.relatedInspections.length})
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {traceData.relatedInspections.map((qc, idx) => (
                        <div key={idx} style={{
                          padding: '10px 12px',
                          background: '#F0FDF4',
                          border: '1px solid #BBF7D0',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px'
                        }}>
                          <Check size={15} color="#16A34A" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <div style={{ fontSize: '12px', lineHeight: 1.4 }}>
                            <div style={{ fontWeight: '700', color: '#166534', display: 'flex', gap: '6px' }}>
                              <span>Inspection #{qc.inspectionId} ({qc.inspectionType})</span>
                              <span style={{ color: '#15803D' }}>• {qc.status}</span>
                            </div>
                            <div style={{ color: '#14532D', marginTop: '2px' }}>
                              {qc.remarks || 'All test parameters in compliance.'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Recursive Tree Node Component
 */
function TreeNodeCard({ node, depth = 0, selectedNode, onSelectNode, getNodeIcon, getNodeBadgeColor }) {
  if (!node) return null;
  const isSelected = selectedNode?.identifier === node.identifier;
  const badgeStyle = getNodeBadgeColor(node.nodeType);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: depth > 0 ? '20px' : '0' }}>
      <div 
        onClick={() => onSelectNode(node)}
        style={{
          padding: '12px 14px',
          background: isSelected ? '#FFFFFF' : '#FFFFFF',
          border: '1px solid',
          borderColor: isSelected ? '#0284C7' : 'var(--border-default)',
          borderRadius: '8px',
          cursor: 'pointer',
          boxShadow: isSelected ? '0 0 0 2px rgba(2, 132, 199, 0.2)' : 'var(--shadow-xs)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {getNodeIcon(node.nodeType)}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {node.identifier}
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: '700',
                padding: '2px 6px',
                borderRadius: '4px',
                background: badgeStyle.bg,
                color: badgeStyle.text,
                border: `1px solid ${badgeStyle.border}`,
                fontFamily: 'var(--font-mono)'
              }}>
                {node.nodeType?.replace(/_/g, ' ')}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {node.name}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', fontFamily: 'var(--font-mono)', color: '#0284C7' }}>
            {Number(node.quantity || 0).toLocaleString()} {node.uom}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {node.status}
          </div>
        </div>
      </div>

      {/* Render child nodes */}
      {node.children && node.children.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          borderLeft: '2px dashed #CBD5E1',
          paddingLeft: '12px',
          marginLeft: '12px',
          marginTop: '2px'
        }}>
          {node.children.map((child, idx) => (
            <TreeNodeCard
              key={idx}
              node={child}
              depth={depth + 1}
              selectedNode={selectedNode}
              onSelectNode={onSelectNode}
              getNodeIcon={getNodeIcon}
              getNodeBadgeColor={getNodeBadgeColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}

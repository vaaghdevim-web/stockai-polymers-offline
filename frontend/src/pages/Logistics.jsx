import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Plus, RefreshCw, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { logisticsApi } from '../services/api';
import CreateDispatchModal from '../components/CreateDispatchModal';

export default function Logistics() {
  const [dispatches, setDispatches] = useState([]);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDispatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await logisticsApi.getDispatches();
      setDispatches(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch dispatches from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDispatches();
  }, []);

  const handleDispatchAction = async (dispatchId) => {
    try {
      await logisticsApi.markAsDispatched(dispatchId);
      fetchDispatches();
    } catch (err) {
      alert(`Dispatch Action Failed: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Warehouse Pallet Staging & Fleet Dispatches
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Finished goods loading docks, GST electronic e-way bills & customer deliveries (Real Dispatch Service)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={fetchDispatches}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <button 
            onClick={() => setShowDispatchModal(true)}
            className="btn btn-primary btn-sm"
          >
            <Plus size={13} /> Create Dispatch Gate Pass
          </button>
        </div>
      </div>

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
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Dispatches Grid */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Dispatch No</th>
              <th>Customer & Destination</th>
              <th>Transport Vehicle</th>
              <th>Driver Details</th>
              <th>Date / Time</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {dispatches.map(dsp => {
              const status = dsp.status || 'CREATED';
              const isDispatched = status === 'DISPATCHED' || status === 'IN_TRANSIT' || status === 'DELIVERED';

              return (
                <tr key={dsp.dispatchId}>
                  <td>
                    <div className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>
                      {dsp.dispatchNumber || `DSP-#${dsp.dispatchId}`}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {dsp.customerName || 'Supreme Industries Ltd'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <MapPin size={11} color="var(--accent-amber)" /> {dsp.destination || 'Chennai Plant'}
                    </div>
                  </td>
                  <td>
                    <div className="font-mono" style={{ fontWeight: '600', color: 'var(--accent-cyan)' }}>
                      {dsp.vehicleNumber || 'TN-28-AB-9812'}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                      {dsp.driverName || 'S. Murugesan'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {dsp.driverPhone || '+91 98421 77210'}
                    </div>
                  </td>
                  <td className="font-mono" style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    {dsp.dispatchedAt ? new Date(dsp.dispatchedAt).toLocaleString() : 'Pending'}
                  </td>
                  <td>
                    <span className={`badge ${isDispatched ? 'badge-emerald' : 'badge-amber'}`}>
                      {status}
                    </span>
                  </td>
                  <td>
                    {!isDispatched ? (
                      <button 
                        onClick={() => handleDispatchAction(dsp.dispatchId)}
                        className="btn btn-primary btn-sm"
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                      >
                        Authorize Dispatch →
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle2 size={13} /> Gatepass Cleared
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {dispatches.length === 0 && !loading && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                  No dispatches recorded in backend database.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CreateDispatchModal
        isOpen={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
        onDispatchAdded={fetchDispatches}
      />
    </div>
  );
}

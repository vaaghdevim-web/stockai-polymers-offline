import React, { useState, useEffect } from 'react';
import { X, Truck, AlertTriangle, CheckCircle, Package } from 'lucide-react';
import { logisticsApi, palletApi } from '../services/api';

export default function CreateDispatchModal({ isOpen, onClose, onDispatchAdded }) {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [finishedBatches, setFinishedBatches] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    orderId: '',
    finishedBatchId: '',
    vehicleId: '',
    driverId: '',
    destination: 'Sriperumbudur Industrial Hub, Tamil Nadu',
    quantityTonnes: '18.0',
    notes: 'GST Electronic E-Way Bill Manifest',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Load prerequisites when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      Promise.allSettled([
        logisticsApi.getVehicles(),
        logisticsApi.getDrivers(),
        logisticsApi.getCustomers(),
        palletApi.getFinishedBatches(),
      ]).then(([vRes, dRes, cRes, bRes]) => {
        const vList = vRes.status === 'fulfilled' ? (vRes.value.data || []) : [];
        const dList = dRes.status === 'fulfilled' ? (dRes.value.data || []) : [];
        const cList = cRes.status === 'fulfilled' ? (cRes.value.data || []) : [];
        const bList = bRes.status === 'fulfilled' ? (bRes.value.data || []) : [];

        setVehicles(vList);
        setDrivers(dList);
        setCustomers(cList);
        setFinishedBatches(bList);

        const initialCustId = cList[0]?.customerId || '';
        const initialBatchId = bList[0]?.finishedBatchId || bList[0]?.batchId || 1;

        setFormData(prev => ({
          ...prev,
          customerId: initialCustId,
          finishedBatchId: initialBatchId,
          vehicleId: vList[0]?.vehicleId || '',
          driverId: dList[0]?.driverId || '',
          orderId: '',
        }));
      });
    }
  }, [isOpen]);

  // Load customer orders whenever customer changes
  useEffect(() => {
    if (!isOpen || !formData.customerId) {
      setOrders([]);
      return;
    }

    let isMounted = true;
    setLoadingOrders(true);

    logisticsApi.getCustomerOrders({ customerId: formData.customerId })
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setOrders(list);
        if (list.length > 0) {
          setFormData(prev => ({
            ...prev,
            orderId: list[0].orderId,
          }));
        } else {
          // If no orders for this specific customer, fetch all orders as fallback
          logisticsApi.getCustomerOrders()
            .then(allRes => {
              if (!isMounted) return;
              const allList = Array.isArray(allRes.data) ? allRes.data : [];
              if (allList.length > 0) {
                setOrders(allList);
                setFormData(prev => ({
                  ...prev,
                  orderId: allList[0].orderId,
                }));
              } else {
                setFormData(prev => ({ ...prev, orderId: '' }));
              }
            })
            .catch(() => {
              if (isMounted) setFormData(prev => ({ ...prev, orderId: '' }));
            });
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch customer orders:', err);
        if (isMounted) {
          setOrders([]);
          setFormData(prev => ({ ...prev, orderId: '' }));
        }
      })
      .finally(() => {
        if (isMounted) setLoadingOrders(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, formData.customerId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.orderId) {
      setError('No valid customer order is available for dispatch. Dispatch creation requires an authorized Customer Order linked to the customer account.');
      return;
    }

    setSubmitting(true);
    try {
      const fbId = formData.finishedBatchId
        ? Number(formData.finishedBatchId)
        : (finishedBatches[0]?.finishedBatchId || 1);

      const payload = {
        orderId: Number(formData.orderId),
        vehicleId: formData.vehicleId ? Number(formData.vehicleId) : null,
        driverId: formData.driverId ? Number(formData.driverId) : null,
        carrier: 'SVP Logistics Fleet',
        shippingMethod: 'Road Freight Express',
        trackingNumber: `TRK-TN-${Date.now().toString().slice(-6)}`,
        items: [
          {
            finishedBatchId: fbId,
            quantity: parseFloat(formData.quantityTonnes) * 1000,
          },
        ],
        notes: formData.notes,
      };

      await logisticsApi.createDispatch(payload);
      if (onDispatchAdded) {
        onDispatchAdded();
      }
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create dispatch.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Truck size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Generate Dispatch Gate Pass & E-Way Manifest
            </h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{
            padding: '8px 12px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-coral)',
            fontSize: '12px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Customer Account *
            </label>
            <select
              className="select"
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
            >
              {customers.map(c => (
                <option key={c.customerId} value={c.customerId}>
                  {c.customerCode} — {c.customerName}
                </option>
              ))}
              {customers.length === 0 && (
                <option value="">No customer accounts found</option>
              )}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Customer Order Reference *
            </label>
            {orders.length > 0 ? (
              <select
                className="select font-mono"
                value={formData.orderId || ''}
                onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                required
              >
                {orders.map(o => (
                  <option key={o.orderId} value={o.orderId}>
                    {o.orderNumber} ({o.status || 'Open'}) — ₹{Number(o.grandTotal || 0).toLocaleString()} [{o.customerCode || 'IFFCO'}]
                  </option>
                ))}
              </select>
            ) : (
              <div style={{
                padding: '8px 12px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--accent-coral)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <span>{loadingOrders ? 'Loading customer orders...' : 'No valid customer order is available for dispatch. Dispatch creation requires an authorized Customer Order linked to the customer account.'}</span>
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Finished Batch Source *
            </label>
            <select
              className="select font-mono"
              value={formData.finishedBatchId || ''}
              onChange={(e) => setFormData({ ...formData, finishedBatchId: e.target.value })}
              required
            >
              {finishedBatches.map(fb => (
                <option key={fb.finishedBatchId || fb.batchId} value={fb.finishedBatchId || fb.batchId}>
                  {fb.batchNo || fb.batchCode} — {fb.productName || fb.productCode || 'Finished Bags'} ({Number(fb.availableWeightKg || fb.qtyProduced || 0).toLocaleString()} kg)
                </option>
              ))}
              {finishedBatches.length === 0 && (
                <option value="1">FB-2026-BAG-01 — 50KG PP Fertilizer Bag (10,000 kg)</option>
              )}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Fleet Transport Vehicle
              </label>
              <select
                className="select font-mono"
                value={formData.vehicleId}
                onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
              >
                {vehicles.map(v => (
                  <option key={v.vehicleId} value={v.vehicleId}>
                    {v.vehicleNumber} ({v.vehicleType || 'Truck'})
                  </option>
                ))}
                {vehicles.length === 0 && (
                  <option value="">No fleet vehicles registered</option>
                )}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Assigned Driver
              </label>
              <select
                className="select"
                value={formData.driverId}
                onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
              >
                {drivers.map(d => (
                  <option key={d.driverId} value={d.driverId}>
                    {d.driverName} ({d.phone})
                  </option>
                ))}
                {drivers.length === 0 && (
                  <option value="">No drivers assigned</option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Volume (Metric Tonnes)
            </label>
            <input
              type="number"
              step="0.1"
              required
              className="input font-mono"
              value={formData.quantityTonnes}
              onChange={(e) => setFormData({ ...formData, quantityTonnes: e.target.value })}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Dispatch Notes & Gatepass Manifest
            </label>
            <input
              type="text"
              className="input"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting || !formData.orderId} 
              className="btn btn-primary" 
              style={{ 
                flex: 1,
                opacity: (!formData.orderId || submitting) ? 0.6 : 1,
                cursor: (!formData.orderId || submitting) ? 'not-allowed' : 'pointer'
              }}
              title={!formData.orderId ? 'Disabled: No valid customer order is available' : ''}
            >
              {submitting ? 'Creating Dispatch...' : 'Authorize Gate Pass'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

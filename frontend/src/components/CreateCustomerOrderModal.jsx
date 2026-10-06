import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, AlertCircle, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { logisticsApi, finishedGoodsApi } from '../services/api';

export default function CreateCustomerOrderModal({ isOpen, onClose, onOrderCreated }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingPrereqs, setLoadingPrereqs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    customerId: '',
    orderNumber: '',
    requiredDate: '',
    productId: '',
    orderedQty: '5000',
    rate: '55.00',
  });

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setLoadingPrereqs(true);
      Promise.allSettled([
        logisticsApi.getCustomers(),
        finishedGoodsApi.getProducts(true),
      ]).then(([custRes, prodRes]) => {
        const custList = custRes.status === 'fulfilled' ? (custRes.value.data || []) : [];
        const prodList = prodRes.status === 'fulfilled' ? (prodRes.value.data || []) : [];
        setCustomers(custList);
        setProducts(prodList);

        const initialCust = custList[0]?.customerId || '';
        const initialProd = prodList[0]?.productId || '';
        const initialCost = prodList[0]?.standardCost ? (Number(prodList[0].standardCost) * 1.25).toFixed(2) : '55.00';

        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);

        setFormData({
          customerId: initialCust,
          orderNumber: `SO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
          requiredDate: defaultDate.toISOString().split('T')[0],
          productId: initialProd,
          orderedQty: '5000',
          rate: initialCost,
        });
      }).finally(() => {
        setLoadingPrereqs(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProductChange = (prodId) => {
    const selected = products.find(p => String(p.productId) === String(prodId));
    const rate = selected?.standardCost ? (Number(selected.standardCost) * 1.25).toFixed(2) : '55.00';
    setFormData(prev => ({
      ...prev,
      productId: prodId,
      rate,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.customerId) {
      setError('Please select a customer.');
      return;
    }
    if (!formData.productId) {
      setError('Please select a finished product.');
      return;
    }
    if (!formData.orderedQty || Number(formData.orderedQty) <= 0) {
      setError('Please enter a valid order quantity.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        customerId: Number(formData.customerId),
        orderNumber: formData.orderNumber?.trim() || undefined,
        requiredDate: formData.requiredDate || undefined,
        items: [
          {
            productId: Number(formData.productId),
            orderedQty: parseFloat(formData.orderedQty),
            rate: formData.rate ? parseFloat(formData.rate) : undefined,
          }
        ]
      };

      const res = await logisticsApi.createCustomerOrder(payload);
      if (onOrderCreated) {
        onOrderCreated(res.data);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create sales order.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProduct = products.find(p => String(p.productId) === String(formData.productId));
  const subtotal = (Number(formData.orderedQty || 0) * Number(formData.rate || 0));
  const gst = subtotal * 0.18;
  const grandTotal = subtotal + gst;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
              Book Customer Sales Order
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
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                Order Number
              </label>
              <input
                type="text"
                required
                className="input font-mono"
                value={formData.orderNumber}
                onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                Required Delivery Date
              </label>
              <input
                type="date"
                required
                className="input"
                value={formData.requiredDate}
                onChange={(e) => setFormData({ ...formData, requiredDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
              Customer / Client *
            </label>
            <select
              className="select"
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              required
            >
              {customers.map(c => (
                <option key={c.customerId} value={c.customerId}>
                  {c.customerCode ? `[${c.customerCode}] ` : ''}{c.customerName}
                </option>
              ))}
              {customers.length === 0 && (
                <option value="">No active customers found</option>
              )}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
              Finished Product *
            </label>
            <select
              className="select"
              value={formData.productId}
              onChange={(e) => handleProductChange(e.target.value)}
              required
            >
              {products.map(p => (
                <option key={p.productId} value={p.productId}>
                  {p.productCode} — {p.productName} ({p.categoryName || 'Standard'})
                </option>
              ))}
              {products.length === 0 && (
                <option value="">No finished products defined</option>
              )}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                Order Quantity (Bags) *
              </label>
              <input
                type="number"
                min="1"
                required
                className="input font-mono"
                value={formData.orderedQty}
                onChange={(e) => setFormData({ ...formData, orderedQty: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                Unit Rate (₹ / Bag)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                className="input font-mono"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
              />
            </div>
          </div>

          {/* Pricing Calculation Summary */}
          <div style={{
            background: 'var(--bg-surface)',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            fontSize: '11.5px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
              <span className="font-mono">₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>GST (18%):</span>
              <span className="font-mono">₹{gst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '4px', fontWeight: '700' }}>
              <span style={{ color: 'var(--text-primary)' }}>Grand Total:</span>
              <span className="font-mono" style={{ color: 'var(--accent-emerald)' }}>
                ₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting || loadingPrereqs} className="btn btn-primary" style={{ flex: 1 }}>
              {submitting ? 'Booking Order...' : 'Book Sales Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

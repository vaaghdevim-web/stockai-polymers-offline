import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  MapPin, 
  Plus, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Barcode, 
  QrCode,
  Layers, 
  Printer, 
  ArrowUpRight,
  Filter,
  Search,
  User,
  Phone,
  Calendar,
  ShieldCheck,
  FileText,
  ShoppingBag,
  Building2
} from 'lucide-react';
import { logisticsApi, palletApi } from '../services/api';
import CreateDispatchModal from '../components/CreateDispatchModal';
import CreatePalletModal from '../components/CreatePalletModal';
import PalletLabelModal from '../components/PalletLabelModal';
import DispatchGatePassModal from '../components/DispatchGatePassModal';
import CreateCustomerOrderModal from '../components/CreateCustomerOrderModal';
import VehicleModal from '../components/VehicleModal';
import DriverModal from '../components/DriverModal';
import CustomerModal from '../components/CustomerModal';
import BarcodeVisual from '../components/BarcodeVisual';

export default function Logistics({ onNavigate, onOpenBarcodeScanner, onOpenBarcodeGenerator }) {
  const [activeTab, setActiveTab] = useState('pallets'); // 'pallets' | 'orders' | 'dispatches' | 'vehicles' | 'drivers' | 'customers'
  const [pallets, setPallets] = useState([]);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showCreatePalletModal, setShowCreatePalletModal] = useState(false);
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [selectedLabelPallet, setSelectedLabelPallet] = useState(null);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [selectedGatePassDispatch, setSelectedGatePassDispatch] = useState(null);
  const [showGatePassModal, setShowGatePassModal] = useState(false);

  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPallets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await palletApi.getAll();
      setPallets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.message || 'Failed to fetch pallets.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await logisticsApi.getCustomerOrders();
      setCustomerOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.message || 'Failed to fetch customer orders.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDispatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await logisticsApi.getDispatches();
      setDispatches(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.message || 'Failed to fetch dispatches.');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await logisticsApi.getVehicles();
      setVehicles(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.message || 'Failed to fetch vehicles.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await logisticsApi.getDrivers();
      setDrivers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.message || 'Failed to fetch drivers.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await logisticsApi.getCustomers({ activeOnly: false });
      setCustomers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.message || 'Failed to fetch customers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pallets') {
      fetchPallets();
    } else if (activeTab === 'orders') {
      fetchCustomerOrders();
    } else if (activeTab === 'dispatches') {
      fetchDispatches();
    } else if (activeTab === 'vehicles') {
      fetchVehicles();
    } else if (activeTab === 'drivers') {
      fetchDrivers();
    } else if (activeTab === 'customers') {
      fetchCustomers();
    }
  }, [activeTab]);

  const handleDispatchAction = async (dispatchId) => {
    try {
      await logisticsApi.markAsDispatched(dispatchId);
      fetchDispatches();
    } catch (err) {
      alert(`Dispatch Action Failed: ${err.message}`);
    }
  };

  const handleDeliverDispatch = async (dispatchId) => {
    if (!window.confirm(`Confirm receipt: Mark dispatch #${dispatchId} as DELIVERED to customer destination?`)) return;
    try {
      await logisticsApi.markAsDelivered(dispatchId);
      fetchDispatches();
    } catch (err) {
      alert(`Deliver Dispatch Failed: ${err?.response?.data?.message || err.message}`);
    }
  };

  const handleCancelDispatch = async (dispatchId) => {
    if (!window.confirm(`Are you sure you want to CANCEL dispatch #${dispatchId}? This will void the gate pass.`)) return;
    try {
      await logisticsApi.cancelDispatch(dispatchId);
      fetchDispatches();
    } catch (err) {
      alert(`Cancel Dispatch Failed: ${err?.response?.data?.message || err.message}`);
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!window.confirm(`Are you sure you want to delete vehicle #${vehicleId}?`)) return;
    try {
      await logisticsApi.deleteVehicle(vehicleId);
      fetchVehicles();
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Failed to delete vehicle.');
    }
  };

  const handleDeleteDriver = async (driverId) => {
    if (!window.confirm(`Are you sure you want to delete driver #${driverId}?`)) return;
    try {
      await logisticsApi.deleteDriver(driverId);
      fetchDrivers();
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Failed to delete driver.');
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (!window.confirm(`Are you sure you want to delete customer #${customerId}?`)) return;
    try {
      await logisticsApi.deleteCustomer(customerId);
      fetchCustomers();
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Failed to delete customer.');
    }
  };

  const handlePrintPalletLabel = (pallet) => {
    setSelectedLabelPallet(pallet);
    setShowLabelModal(true);
  };

  const handleOpenGatePass = (dsp) => {
    setSelectedGatePassDispatch(dsp);
    setShowGatePassModal(true);
  };

  const filteredPallets = pallets.filter((p) => {
    const q = search.toLowerCase();
    return (
      (p.palletIdentifier && p.palletIdentifier.toLowerCase().includes(q)) ||
      (p.sscc && p.sscc.toLowerCase().includes(q)) ||
      (p.binCode && p.binCode.toLowerCase().includes(q)) ||
      (p.skuCode && p.skuCode.toLowerCase().includes(q))
    );
  });

  const filteredCustomerOrders = customerOrders.filter((o) => {
    const q = search.toLowerCase();
    return (
      (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
      (o.customerName && o.customerName.toLowerCase().includes(q)) ||
      (o.status && o.status.toLowerCase().includes(q))
    );
  });

  const filteredDispatches = dispatches.filter((d) => {
    const q = search.toLowerCase();
    return (
      (d.dispatchNumber && d.dispatchNumber.toLowerCase().includes(q)) ||
      (d.customerName && d.customerName.toLowerCase().includes(q)) ||
      (d.destination && d.destination.toLowerCase().includes(q)) ||
      (d.vehicleNumber && d.vehicleNumber.toLowerCase().includes(q)) ||
      (d.driverName && d.driverName.toLowerCase().includes(q))
    );
  });

  const filteredVehicles = vehicles.filter((v) => {
    const q = search.toLowerCase();
    return (
      (v.vehicleNumber && v.vehicleNumber.toLowerCase().includes(q)) ||
      (v.vehicleType && v.vehicleType.toLowerCase().includes(q))
    );
  });

  const filteredDrivers = drivers.filter((dr) => {
    const q = search.toLowerCase();
    return (
      (dr.driverName && dr.driverName.toLowerCase().includes(q)) ||
      (dr.licenseNumber && dr.licenseNumber.toLowerCase().includes(q)) ||
      (dr.phone && dr.phone.includes(q))
    );
  });

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.customerName && c.customerName.toLowerCase().includes(q)) ||
      (c.customerCode && c.customerCode.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const refreshCurrentTab = () => {
    if (activeTab === 'pallets') fetchPallets();
    else if (activeTab === 'orders') fetchCustomerOrders();
    else if (activeTab === 'dispatches') fetchDispatches();
    else if (activeTab === 'vehicles') fetchVehicles();
    else if (activeTab === 'drivers') fetchDrivers();
    else if (activeTab === 'customers') fetchCustomers();
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header & Main Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Warehouse Logistics & Fleet Dispatch
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            GS1-128 pallet tracking, security gate passes, transport waybills, fleet vehicles & driver roster.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {onOpenBarcodeScanner && (
            <button
              onClick={onOpenBarcodeScanner}
              className="btn btn-secondary btn-sm"
              title="Open Barcode & QR Scanner"
            >
              <Barcode size={14} color="#0284C7" /> Scan
            </button>
          )}

          {onOpenBarcodeGenerator && (
            <button
              onClick={onOpenBarcodeGenerator}
              className="btn btn-secondary btn-sm"
              title="Open Barcode & QR Generator"
            >
              <QrCode size={14} color="#0284C7" /> Generate Code
            </button>
          )}

          {activeTab === 'pallets' && (
            <button 
              onClick={() => setShowCreatePalletModal(true)}
              className="btn btn-primary btn-sm"
            >
              <Plus size={14} /> + Build Pallet
            </button>
          )}

          {activeTab === 'orders' && (
            <button 
              onClick={() => setShowCreateOrderModal(true)}
              className="btn btn-primary btn-sm"
              style={{ background: '#0284C7', borderColor: '#0284C7' }}
            >
              <Plus size={14} /> + Book Sales Order
            </button>
          )}

          {activeTab === 'dispatches' && (
            <button 
              onClick={() => setShowDispatchModal(true)}
              className="btn btn-primary btn-sm"
            >
              <Plus size={14} /> + Create Gate Pass
            </button>
          )}

          {activeTab === 'vehicles' && (
            <button 
              onClick={() => { setSelectedVehicle(null); setShowVehicleModal(true); }}
              className="btn btn-primary btn-sm"
              style={{ background: '#0284C7', borderColor: '#0284C7' }}
            >
              <Plus size={14} /> + Add Vehicle
            </button>
          )}

          {activeTab === 'drivers' && (
            <button 
              onClick={() => { setSelectedDriver(null); setShowDriverModal(true); }}
              className="btn btn-primary btn-sm"
              style={{ background: '#0284C7', borderColor: '#0284C7' }}
            >
              <Plus size={14} /> + Enrol Driver
            </button>
          )}

          {activeTab === 'customers' && (
            <button 
              onClick={() => { setSelectedCustomer(null); setShowCustomerModal(true); }}
              className="btn btn-primary btn-sm"
              style={{ background: '#0284C7', borderColor: '#0284C7' }}
            >
              <Plus size={14} /> + Onboard Customer
            </button>
          )}

          <button 
            onClick={refreshCurrentTab}
            disabled={loading}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--accent-coral-light)',
          border: '1px solid var(--accent-coral-border)',
          borderRadius: '8px',
          color: 'var(--accent-coral-text)',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Container Card */}
      <div className="panel-card" style={{ padding: '0', overflow: 'hidden' }}>
        {/* Navigation Tabs */}
        <div className="tab-list" style={{ padding: '0 16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('pallets')}
            className={`tab-button ${activeTab === 'pallets' ? 'active' : ''}`}
          >
            <Layers size={14} /> Pallets & GS1 Barcodes ({pallets.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`tab-button ${activeTab === 'orders' ? 'active' : ''}`}
          >
            <ShoppingBag size={14} /> Customer Orders ({customerOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('dispatches')}
            className={`tab-button ${activeTab === 'dispatches' ? 'active' : ''}`}
          >
            <Truck size={14} /> Fleet Dispatches & Waybills ({dispatches.length})
          </button>
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`tab-button ${activeTab === 'vehicles' ? 'active' : ''}`}
          >
            <Truck size={14} /> Transport Vehicles ({vehicles.length})
          </button>
          <button
            onClick={() => setActiveTab('drivers')}
            className={`tab-button ${activeTab === 'drivers' ? 'active' : ''}`}
          >
            <User size={14} /> Driver Roster ({drivers.length})
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`tab-button ${activeTab === 'customers' ? 'active' : ''}`}
          >
            <Building2 size={14} /> Commercial Customers ({customers.length})
          </button>
        </div>

        {/* Filter Bar */}
        <div style={{
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-default)',
          background: '#FFFFFF',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '9px' }} />
            <input
              type="text"
              className="input"
              placeholder={
                activeTab === 'pallets' ? 'Search Pallet ID, SSCC, Bin...' :
                activeTab === 'dispatches' ? 'Search Dispatch No, Customer, Vehicle...' :
                activeTab === 'vehicles' ? 'Search Vehicle Number, Type...' :
                activeTab === 'customers' ? 'Search Customer Name, ERP Code...' :
                'Search Driver Name, License, Phone...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '32px', fontSize: '12.5px' }}
            />
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Showing{' '}
            {activeTab === 'pallets' ? filteredPallets.length :
             activeTab === 'dispatches' ? filteredDispatches.length :
             activeTab === 'vehicles' ? filteredVehicles.length :
             filteredDrivers.length} records
          </div>
        </div>

        {/* Tab 1: Pallets & GS1 Barcodes Table */}
        {activeTab === 'pallets' && (
          <div className="data-table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pallet ID / Code</th>
                  <th>GS1 SSCC Barcode</th>
                  <th>SKU / Product</th>
                  <th>Warehouse Location</th>
                  <th style={{ textAlign: 'right' }}>Total Units</th>
                  <th style={{ textAlign: 'right' }}>Gross Weight</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Label Print</th>
                </tr>
              </thead>
              <tbody>
                {filteredPallets.map((p, idx) => (
                  <tr key={p.palletId || idx}>
                    <td>
                      <div className="font-mono" style={{ fontWeight: '700', color: '#0284C7' }}>
                        {p.palletIdentifier || `PAL-${1000 + idx}`}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Created: {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Today'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarcodeVisual value={p.sscc || `(00)38901234567890${idx}`} height={22} width={1} />
                        <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {p.sscc || `(00)38901234567890${idx}`}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{p.skuCode || 'PP Woven Bags 50kg'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Batch: {p.batchNumber || 'BAT-2026-09'}</div>
                    </td>
                    <td>
                      <span className="badge badge-muted font-mono">{p.binCode || 'BIN-A1-04'}</span>
                    </td>
                    <td className="font-mono" style={{ textAlign: 'right', fontWeight: '600' }}>
                      {p.totalUnits || 2000} pcs
                    </td>
                    <td className="font-mono" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                      {p.grossWeightKg || 520} kg
                    </td>
                    <td>
                      <span className="badge badge-emerald">{p.status || 'STAGED'}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => handlePrintPalletLabel(p)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px', fontSize: '11.5px' }}
                      >
                        <Printer size={13} color="#0284C7" /> 4"x6" Label
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredPallets.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No pallets found in warehouse. Click "+ Build Pallet" to stage new finished goods.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 1b: Customer Sales Orders Table */}
        {activeTab === 'orders' && (
          <div className="data-table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>Customer</th>
                  <th>Product Items</th>
                  <th style={{ textAlign: 'right' }}>Quantity</th>
                  <th style={{ textAlign: 'right' }}>Total Value (₹)</th>
                  <th>Required Delivery</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Dispatch Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomerOrders.map((o) => (
                  <tr key={o.orderId}>
                    <td>
                      <div className="font-mono" style={{ fontWeight: '700', color: '#0284C7' }}>
                        {o.orderNumber}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Booked: {o.orderDate ? new Date(o.orderDate).toLocaleDateString() : 'Today'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                        {o.customerName || 'Direct Customer'}
                      </div>
                      <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {o.customerCode || `CUST-#${o.customerId}`}
                      </div>
                    </td>
                    <td>
                      {o.items && o.items.length > 0 ? (
                        <div>
                          <div style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>
                            {o.items[0].productName || o.items[0].productCode}
                          </div>
                          {o.items.length > 1 && (
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                              +{o.items.length - 1} other item(s)
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Standard PP Bags</span>
                      )}
                    </td>
                    <td className="font-mono" style={{ textAlign: 'right', fontWeight: '700' }}>
                      {o.items && o.items[0]?.orderedQty
                        ? `${Number(o.items[0].orderedQty).toLocaleString()} Bags`
                        : '5,000 Bags'}
                    </td>
                    <td className="font-mono" style={{ textAlign: 'right', fontWeight: '700', color: 'var(--accent-emerald)' }}>
                      ₹{Number(o.grandTotal || o.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="font-mono" style={{ fontSize: '12px' }}>
                      {o.requiredDate ? new Date(o.requiredDate).toLocaleDateString() : 'Immediate'}
                    </td>
                    <td>
                      <span className={`badge ${
                        o.status === 'Closed' ? 'badge-emerald' : 
                        o.status === 'Partial' ? 'badge-sky' : 'badge-amber'
                      }`}>
                        {o.status || 'OPEN'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => setShowDispatchModal(true)}
                        className="btn btn-secondary btn-xs"
                        style={{ color: '#0284C7', borderColor: '#BAE6FD', background: '#F0F9FF' }}
                      >
                        <Truck size={12} /> Dispatch Outward
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredCustomerOrders.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No customer sales orders found. Click "+ Book Sales Order" to record an incoming customer purchase order.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Dispatches Grid Table */}
        {activeTab === 'dispatches' && (
          <div className="data-table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Dispatch No</th>
                  <th>Customer & Destination</th>
                  <th>Transport Vehicle</th>
                  <th>Driver Details</th>
                  <th>Quantity Tonnes</th>
                  <th>Date / Time</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDispatches.map((dsp) => {
                  const status = dsp.status || 'CREATED';
                  const isDispatched = status === 'DISPATCHED' || status === 'IN_TRANSIT' || status === 'DELIVERED';

                  return (
                    <tr key={dsp.dispatchId}>
                      <td>
                        <div className="font-mono" style={{ color: '#0284C7', fontWeight: '700' }}>
                          {dsp.dispatchNumber || `DSP-#${dsp.dispatchId}`}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                          {dsp.customerName || 'Supreme Industries Ltd'}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <MapPin size={12} color="#F59E0B" /> {dsp.destination || 'Chennai Plant'}
                        </div>
                      </td>
                      <td>
                        <div className="font-mono" style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                          {dsp.vehicleNumber || 'TN-28-AB-9812'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>
                          {dsp.driverName || 'S. Murugesan'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {dsp.driverPhone || '+91 98421 77210'}
                        </div>
                      </td>
                      <td className="font-mono" style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {dsp.quantityTonnes ? `${Number(dsp.quantityTonnes).toFixed(2)} MT` : '18.00 MT'}
                      </td>
                      <td className="font-mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {dsp.dispatchedAt ? new Date(dsp.dispatchedAt).toLocaleString() : 'Pending'}
                      </td>
                      <td>
                        <span className={`badge ${isDispatched ? 'badge-emerald' : 'badge-amber'}`}>
                          {status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            onClick={() => handleOpenGatePass(dsp)}
                            className="btn btn-secondary btn-xs"
                            title="Print Official Security Gate Pass & Waybill"
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                          >
                            <Printer size={12} color="#0284C7" /> Gate Pass
                          </button>

                          {(status === 'CREATED' || status === 'PENDING') && (
                            <button 
                              onClick={() => handleDispatchAction(dsp.dispatchId)}
                              className="btn btn-primary btn-xs"
                              style={{ fontSize: '11px', padding: '4px 8px' }}
                            >
                              Authorize →
                            </button>
                          )}

                          {(status === 'DISPATCHED' || status === 'IN_TRANSIT') && (
                            <button
                              onClick={() => handleDeliverDispatch(dsp.dispatchId)}
                              className="btn btn-secondary btn-xs"
                              style={{ fontSize: '11px', padding: '4px 8px', color: '#059669', borderColor: '#A7F3D0' }}
                              title="Mark shipment delivered at customer facility"
                            >
                              <CheckCircle2 size={12} /> Delivered
                            </button>
                          )}

                          {status !== 'DELIVERED' && status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleCancelDispatch(dsp.dispatchId)}
                              className="btn btn-ghost btn-xs"
                              style={{ fontSize: '11px', padding: '4px 8px', color: '#EF4444' }}
                              title="Cancel dispatch and void gate pass"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredDispatches.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                      No dispatches recorded. Click "+ Create Gate Pass" to dispatch shipments.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Transport Vehicles Registry */}
        {activeTab === 'vehicles' && (
          <div className="data-table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle Registration No</th>
                  <th>Vehicle Type</th>
                  <th style={{ textAlign: 'right' }}>Max Capacity</th>
                  <th>Operational Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((v, idx) => (
                  <tr key={v.vehicleId || idx}>
                    <td>
                      <div className="font-mono" style={{ fontWeight: '800', color: '#0284C7', fontSize: '13px' }}>
                        {v.vehicleNumber}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Vehicle ID: #{v.vehicleId}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{v.vehicleType || 'Heavy Commercial Truck'}</div>
                    </td>
                    <td className="font-mono" style={{ textAlign: 'right', fontWeight: '700', fontSize: '13px' }}>
                      {v.capacity ? `${v.capacity} ${v.capacityUomCode || 'TONNES'}` : '20 TONNES'}
                    </td>
                    <td>
                      <span className={v.isActive ? 'badge badge-emerald' : 'badge badge-amber'}>
                        {v.isActive ? 'AVAILABLE / ACTIVE' : 'MAINTENANCE / INACTIVE'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button
                          onClick={() => { setSelectedVehicle(v); setShowVehicleModal(true); }}
                          className="btn btn-secondary btn-xs"
                          style={{ fontSize: '11px', padding: '3px 8px' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteVehicle(v.vehicleId)}
                          className="btn btn-ghost btn-xs"
                          style={{ fontSize: '11px', padding: '3px 8px', color: '#EF4444' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredVehicles.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                      No vehicles registered in the fleet repository. Click "+ Add Vehicle" to register one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Driver Roster */}
        {activeTab === 'drivers' && (
          <div className="data-table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Driver Name</th>
                  <th>License Number</th>
                  <th>License Expiry</th>
                  <th>Contact Phone</th>
                  <th>Roster Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((dr, idx) => (
                  <tr key={dr.driverId || idx}>
                    <td>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '13px' }}>
                        {dr.driverName}
                      </div>
                      <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Driver ID: #{dr.driverId}</div>
                    </td>
                    <td>
                      <span className="font-mono badge badge-muted" style={{ fontSize: '11.5px' }}>
                        {dr.licenseNumber || 'TN-05-2018-98124'}
                      </span>
                    </td>
                    <td className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {dr.licenseExpiry ? new Date(dr.licenseExpiry).toLocaleDateString() : 'Valid (2028)'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-primary)' }}>
                        <Phone size={12} color="var(--text-muted)" />
                        <span className="font-mono">{dr.phone || '+91 98400 12345'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={dr.isActive ? 'badge badge-emerald' : 'badge badge-amber'}>
                        {dr.isActive ? 'ON ROSTER / AVAILABLE' : 'OFF DUTY'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button
                          onClick={() => { setSelectedDriver(dr); setShowDriverModal(true); }}
                          className="btn btn-secondary btn-xs"
                          style={{ fontSize: '11px', padding: '3px 8px' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteDriver(dr.driverId)}
                          className="btn btn-ghost btn-xs"
                          style={{ fontSize: '11px', padding: '3px 8px', color: '#EF4444' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredDrivers.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                      No drivers registered in the fleet roster. Click "+ Enrol Driver" to add one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 5: Commercial Customers Directory */}
        {activeTab === 'customers' && (
          <div className="data-table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer ERP Code</th>
                  <th>Enterprise Name</th>
                  <th>Contact Information</th>
                  <th>Account Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c, idx) => (
                  <tr key={c.customerId || idx}>
                    <td>
                      <div className="font-mono" style={{ fontWeight: '800', color: '#0284C7', fontSize: '13px' }}>
                        {c.customerCode}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Customer ID: #{c.customerId}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '13px' }}>
                        {c.customerName}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                        {c.phone || 'No phone recorded'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {c.email || 'No email recorded'}
                      </div>
                    </td>
                    <td>
                      <span className={c.isActive ? 'badge badge-emerald' : 'badge badge-amber'}>
                        {c.isActive ? 'ACTIVE / APPROVED' : 'INACTIVE'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button
                          onClick={() => { setSelectedCustomer(c); setShowCustomerModal(true); }}
                          className="btn btn-secondary btn-xs"
                          style={{ fontSize: '11px', padding: '3px 8px' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(c.customerId)}
                          className="btn btn-ghost btn-xs"
                          style={{ fontSize: '11px', padding: '3px 8px', color: '#EF4444' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredCustomers.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                      No commercial customers registered. Click "+ Onboard Customer" to add one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateDispatchModal
        isOpen={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
        onDispatchAdded={fetchDispatches}
      />

      <CreatePalletModal
        isOpen={showCreatePalletModal}
        onClose={() => setShowCreatePalletModal(false)}
        onPalletCreated={fetchPallets}
      />

      <CreateCustomerOrderModal
        isOpen={showCreateOrderModal}
        onClose={() => setShowCreateOrderModal(false)}
        onOrderCreated={fetchCustomerOrders}
      />

      <PalletLabelModal
        isOpen={showLabelModal}
        onClose={() => setShowLabelModal(false)}
        pallet={selectedLabelPallet}
      />

      <DispatchGatePassModal
        isOpen={showGatePassModal}
        onClose={() => {
          setShowGatePassModal(false);
          setSelectedGatePassDispatch(null);
        }}
        dispatch={selectedGatePassDispatch}
      />

      <VehicleModal
        isOpen={showVehicleModal}
        onClose={() => {
          setShowVehicleModal(false);
          setSelectedVehicle(null);
        }}
        vehicle={selectedVehicle}
        onSaved={fetchVehicles}
      />

      <DriverModal
        isOpen={showDriverModal}
        onClose={() => {
          setShowDriverModal(false);
          setSelectedDriver(null);
        }}
        driver={selectedDriver}
        onSaved={fetchDrivers}
      />

      <CustomerModal
        isOpen={showCustomerModal}
        onClose={() => {
          setShowCustomerModal(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
        onSaved={fetchCustomers}
      />
    </div>
  );
}


import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  ChevronDown, 
  LogOut, 
  Barcode, 
  QrCode,
  Menu, 
  Bell, 
  UserCheck, 
  User, 
  Monitor, 
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { getCurrentUserProfile } from '../services/domain/adminService';
import { procurementApi } from '../services/api';
import { formatPlantName } from '../utils/brand';
import { isTabAllowed } from '../utils/rbac';
import UserProfileModal from './UserProfileModal';

export default function Header({ 
  onOpenCommandPalette, 
  onOpenBarcodeScanner, 
  onOpenBarcodeGenerator,
  roleConfig, 
  onNavigate,
  onToggleSidebar,
  isSidebarCollapsed,
  viewMode = 'mobile',
  onToggleViewMode,
  isMobile = false
}) {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [alertCount, setAlertCount] = useState(0);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const dropdownRef = useRef(null);
  const alertsRef = useRef(null);

  const loadAlerts = () => {
    setLoadingAlerts(true);
    procurementApi.getRecommendations()
      .then((res) => {
        if (Array.isArray(res.data)) {
          setAlerts(res.data);
          const count = res.data.filter(r => (r.status || '').toUpperCase() === 'NEW' || (r.priority || '').toUpperCase() === 'CRITICAL').length;
          setAlertCount(count || res.data.length);
        }
      })
      .catch((err) => {
        console.warn('Failed to load active alerts from backend:', err);
      })
      .finally(() => {
        setLoadingAlerts(false);
      });
  };

  // Fetch user profile and active alerts count on mount
  useEffect(() => {
    let isMounted = true;
    if (user) {
      getCurrentUserProfile()
        .then((res) => {
          if (isMounted && res.data) {
            setProfile(res.data);
          }
        })
        .catch(() => {});

      loadAlerts();
    }
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (alertsRef.current && !alertsRef.current.contains(event.target)) {
        setIsAlertsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const canViewAdmin = isTabAllowed('admin', user?.roles);
  const userInitials = (user?.name || profile?.userName || 'SA').slice(0, 2).toUpperCase();
  const displayName = profile?.userName || user?.name || 'Super Admin';
  const roleName = roleConfig?.displayName || 'Super Admin';

  return (
    <header 
      style={{
        height: 'var(--header-height)',
        background: '#FFFFFF',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 40,
        flexShrink: 0,
        boxShadow: 'var(--shadow-xs)'
      }}
      className="header-container-responsive"
    >
      {/* Left: Sidebar Toggle + Global Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '640px' }}>
        <button
          onClick={onToggleSidebar}
          title={isMobile ? 'Open Navigation Menu' : (isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar')}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-default)',
            borderRadius: '6px',
            padding: '7px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-surface-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <Menu size={18} />
        </button>

        {/* Global Search Bar */}
        <div 
          onClick={onOpenCommandPalette}
          role="button"
          tabIndex={0}
          className="search-input-responsive"
          style={{
            background: '#F8FAFC',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            padding: '7px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-muted)',
            fontSize: '13px',
            cursor: 'pointer',
            flex: 1,
            maxWidth: '460px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-cyan)';
            e.currentTarget.style.background = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-default)';
            e.currentTarget.style.background = '#F8FAFC';
          }}
        >
          <Search size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '12px' }}>
            Search materials, batches...
          </span>
          <kbd className="header-hide-mobile" style={{
            background: '#FFFFFF',
            border: '1px solid var(--border-default)',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '10.5px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-secondary)',
            boxShadow: 'var(--shadow-xs)'
          }}>
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Action Tools: View Mode Toggle + Scan + Generate + Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        
        {/* Desktop / Mobile View Switcher */}
        {onToggleViewMode && (
          <button
            onClick={onToggleViewMode}
            title={viewMode === 'desktop' ? 'Switch back to Mobile Responsive Layout' : 'Switch to Full Desktop View (Wide Screen)'}
            style={{
              background: viewMode === 'desktop' ? '#F0F9FF' : '#F8FAFC',
              border: '1px solid',
              borderColor: viewMode === 'desktop' ? '#0284C7' : 'var(--border-default)',
              borderRadius: '6px',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: viewMode === 'desktop' ? '#0284C7' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#E0F2FE';
              e.currentTarget.style.borderColor = '#0284C7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = viewMode === 'desktop' ? '#F0F9FF' : '#F8FAFC';
              e.currentTarget.style.borderColor = viewMode === 'desktop' ? '#0284C7' : 'var(--border-default)';
            }}
          >
            {viewMode === 'desktop' ? <Smartphone size={15} color="#0284C7" /> : <Monitor size={15} color="#475569" />}
            <span className="btn-text-responsive">{viewMode === 'desktop' ? 'Mobile View' : 'Desktop View'}</span>
          </button>
        )}

        {/* Quick Barcode Scanner Button */}
        {onOpenBarcodeScanner && (
          <button
            onClick={onOpenBarcodeScanner}
            title="Open Quick Barcode & QR Scanner"
            style={{
              background: '#F0F9FF',
              border: '1px solid #BAE6FD',
              borderRadius: '6px',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#0284C7',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#E0F2FE';
              e.currentTarget.style.borderColor = '#0284C7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#F0F9FF';
              e.currentTarget.style.borderColor = '#BAE6FD';
            }}
          >
            <Barcode size={15} />
            <span className="btn-text-responsive">Scan</span>
          </button>
        )}

        {/* Quick Barcode & QR Generator Button */}
        {onOpenBarcodeGenerator && (
          <button
            onClick={onOpenBarcodeGenerator}
            title="Open Barcode & QR Code Generator"
            className="header-hide-mobile"
            style={{
              background: '#F8FAFC',
              border: '1px solid var(--border-default)',
              borderRadius: '6px',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F1F5F9';
              e.currentTarget.style.color = '#0284C7';
              e.currentTarget.style.borderColor = '#0284C7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#F8FAFC';
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.borderColor = 'var(--border-default)';
            }}
          >
            <QrCode size={15} />
            <span className="btn-text-responsive">Generate</span>
          </button>
        )}

        {/* Notifications & Active Inventory Alerts Bell Button */}
        <div style={{ position: 'relative' }} ref={alertsRef}>
          <button
            onClick={() => {
              setIsAlertsOpen(prev => !prev);
              if (!isAlertsOpen) loadAlerts();
            }}
            title={`System Notifications & Alerts (${alertCount} active)`}
            style={{
              position: 'relative',
              background: isAlertsOpen ? 'var(--bg-surface-hover)' : 'transparent',
              border: '1px solid var(--border-default)',
              borderRadius: '6px',
              padding: '7px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: isAlertsOpen ? 'var(--text-primary)' : 'var(--text-secondary)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-surface-hover)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              if (!isAlertsOpen) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
          >
            <Bell size={17} />
            {alertCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                minWidth: '16px',
                height: '16px',
                padding: '0 3px',
                borderRadius: '8px',
                background: '#EF4444',
                color: '#FFFFFF',
                fontSize: '9.5px',
                fontWeight: '700',
                fontFamily: 'var(--font-mono)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 4px rgba(239, 68, 68, 0.4)'
              }}>
                {alertCount}
              </span>
            )}
          </button>

          {/* Active Alerts & Notifications Popover */}
          {isAlertsOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '380px',
              background: '#FFFFFF',
              borderRadius: '10px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid var(--border-default)',
              zIndex: 100,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Header */}
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-default)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#F8FAFC'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={15} color="#0284C7" />
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Active Inventory Alerts
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    background: alertCount > 0 ? '#FEE2E2' : '#E0F2FE',
                    color: alertCount > 0 ? '#DC2626' : '#0284C7',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {alertCount}
                  </span>
                </div>
                <button
                  onClick={loadAlerts}
                  disabled={loadingAlerts}
                  className="btn btn-ghost btn-xs"
                  title="Refresh Alerts"
                  style={{ padding: '3px 6px' }}
                >
                  <RefreshCw size={12} className={loadingAlerts ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Alerts Body */}
              <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '8px' }}>
                {alerts.length > 0 ? (
                  alerts.slice(0, 8).map((al, idx) => {
                    const isCritical = (al.priority || '').toUpperCase() === 'CRITICAL' || (al.status || '').toUpperCase() === 'CRITICAL';
                    return (
                      <div
                        key={al.recommendationId || al.id || idx}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${isCritical ? '#FCA5A5' : 'var(--border-subtle)'}`,
                          background: isCritical ? '#FFF5F5' : '#FAFAFA',
                          marginBottom: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {al.materialName || al.materialCode || `Raw Material Alert #${idx + 1}`}
                          </span>
                          <span style={{
                            fontSize: '9.5px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: isCritical ? '#EF4444' : '#F59E0B',
                            color: '#FFFFFF',
                            fontFamily: 'var(--font-mono)'
                          }}>
                            {al.priority || (isCritical ? 'CRITICAL' : 'REORDER')}
                          </span>
                        </div>

                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                          {al.reason || al.recommendationReason || (al.recommendedOrderQtyKg ? `Stock depleted below threshold. Suggested reorder: ${Number(al.recommendedOrderQtyKg).toLocaleString()} KG` : 'Inventory below safety stock buffer.')}
                        </div>

                        {al.materialCode && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                            <span className="font-mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                              SKU: {al.materialCode}
                            </span>
                            {onNavigate && (
                              <button
                                onClick={() => {
                                  setIsAlertsOpen(false);
                                  onNavigate('procurement');
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#0284C7',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}
                              >
                                Procurement <ArrowRight size={10} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <CheckCircle2 size={24} color="#10B981" style={{ margin: '0 auto 8px' }} />
                    <p style={{ fontSize: '12.5px', fontWeight: '600', margin: '0 0 2px' }}>All inventory levels normal</p>
                    <p style={{ fontSize: '11px', margin: 0 }}>No active replenishment or safety threshold alerts.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              {onNavigate && (
                <div style={{
                  padding: '10px 14px',
                  borderTop: '1px solid var(--border-default)',
                  background: '#F8FAFC',
                  textAlign: 'center'
                }}>
                  <button
                    onClick={() => {
                      setIsAlertsOpen(false);
                      onNavigate('procurement');
                    }}
                    className="btn btn-secondary btn-xs"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '11.5px' }}
                  >
                    Open Procurement & AI Reorder Console →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Avatar & Profile Dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            aria-expanded={isProfileOpen}
            aria-haspopup="true"
            title="User Profile & Settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: isProfileOpen ? '#F1F5F9' : 'transparent',
              border: '1px solid',
              borderColor: isProfileOpen ? 'var(--border-strong)' : 'transparent',
              borderRadius: '8px',
              padding: '4px 6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (!isProfileOpen) e.currentTarget.style.background = '#F8FAFC';
            }}
            onMouseLeave={(e) => {
              if (!isProfileOpen) e.currentTarget.style.background = 'transparent';
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#F1F5F9',
              border: '1px solid var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: '700',
              color: '#0284C7',
              fontFamily: 'var(--font-mono)'
            }}>
              {userInitials}
            </div>
            <div className="header-hide-mobile" style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {displayName}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {roleName}
              </div>
            </div>
            <ChevronDown 
              size={14} 
              color="var(--text-muted)" 
              style={{ 
                transition: 'transform 0.15s ease',
                transform: isProfileOpen ? 'rotate(180deg)' : 'none' 
              }} 
            />
          </button>

          {/* Profile Popover */}
          {isProfileOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '270px',
              background: '#FFFFFF',
              border: '1px solid var(--border-default)',
              borderRadius: '10px',
              boxShadow: 'var(--shadow-lg)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              zIndex: 1000
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '10px'
              }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.05em',
                  fontFamily: 'var(--font-mono)'
                }}>
                  Authenticated User
                </span>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  color: 'var(--accent-emerald-text)',
                  fontWeight: '600'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-emerald)' }} />
                  Online
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Username</div>
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {displayName}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Email</div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '2px', wordBreak: 'break-all', fontSize: '12px' }}>
                    {profile?.email || user?.email || 'admin@stockai.internal'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Role Scope</div>
                  <div style={{ color: '#0284C7', fontFamily: 'var(--font-mono)', fontWeight: '600', marginTop: '2px' }}>
                    {roleName}
                  </div>
                </div>
              </div>

              {/* View Mode Toggle in dropdown */}
              {onToggleViewMode && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      onToggleViewMode();
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{
                      width: '100%',
                      fontSize: '12px',
                      justifyContent: 'center',
                      background: viewMode === 'desktop' ? '#F0F9FF' : '#F8FAFC',
                      borderColor: viewMode === 'desktop' ? '#0284C7' : 'var(--border-default)',
                      color: viewMode === 'desktop' ? '#0284C7' : 'var(--text-secondary)'
                    }}
                  >
                    {viewMode === 'desktop' ? <Smartphone size={13} style={{ marginRight: '6px' }} /> : <Monitor size={13} style={{ marginRight: '6px' }} />}
                    {viewMode === 'desktop' ? 'Switch to Mobile Layout' : 'Switch to Desktop View'}
                  </button>
                </div>
              )}

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                marginTop: '2px',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '10px'
              }}>
                {/* Available to ALL users */}
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    setIsProfileModalOpen(true);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{
                    width: '100%',
                    fontSize: '12px',
                    justifyContent: 'center',
                    background: '#F0F9FF',
                    borderColor: '#BAE6FD',
                    color: '#0284C7'
                  }}
                >
                  <User size={13} style={{ marginRight: '6px' }} /> Edit Profile & Password
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {canViewAdmin && (
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        if (onNavigate) onNavigate('admin');
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, fontSize: '12px', justifyContent: 'center' }}
                    >
                      <UserCheck size={13} style={{ marginRight: '4px' }} /> Admin
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      logout();
                    }}
                    className="btn btn-danger btn-sm"
                    style={{
                      flex: canViewAdmin ? 1 : 'none',
                      width: canViewAdmin ? 'auto' : '100%',
                      fontSize: '12px',
                      justifyContent: 'center'
                    }}
                  >
                    <LogOut size={13} style={{ marginRight: '4px' }} /> Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Self-Service User Profile & Password Modal (Available to all users) */}
      <UserProfileModal 
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onProfileUpdated={(updated) => {
          setProfile(prev => ({
            ...prev,
            ...updated
          }));
        }}
      />
    </header>
  );
}

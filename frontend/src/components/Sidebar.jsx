import React from 'react';
import { 
  LayoutDashboard, 
  Boxes, 
  ShoppingCart, 
  Cpu, 
  FlaskConical, 
  Truck, 
  Building2, 
  Settings, 
  Bot,
  X
} from 'lucide-react';
import { getPrimaryRoleConfig, getAllowedTabs } from '../utils/rbac';

export default function Sidebar({ 
  activeTab, 
  onTabChange, 
  userRoles = [], 
  isCollapsed = false,
  isMobile = false,
  isOpenMobile = false,
  onCloseMobile = null
}) {
  const roleConfig = getPrimaryRoleConfig(userRoles);
  const allowedTabs = getAllowedTabs(userRoles);

  const handleNavClick = (tabId) => {
    onTabChange(tabId);
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Control Room', icon: LayoutDashboard, badge: 'LIVE' },
    { id: 'raw-materials', label: 'Raw Materials & Silos', icon: Boxes, badge: 'STOCKS' },
    { id: 'procurement', label: 'Procurement & Reorder', icon: ShoppingCart, badge: 'PO' },
    { id: 'production', label: 'Production & BOM', icon: Cpu, badge: 'WIP' },
    { id: 'quality', label: 'Quality Lab & MFI', icon: FlaskConical, badge: 'QC' },
    { id: 'logistics', label: 'Warehouse & Dispatch', icon: Truck, badge: 'FLEET' },
    { id: 'suppliers', label: 'Suppliers & Accounts', icon: Building2, badge: 'LEDGER' },
    { id: 'admin', label: 'Admin & Settings', icon: Settings, badge: 'RBAC' },
    { id: 'ai-copilot', label: 'AI Plant', icon: Bot, badge: 'AI' },
  ];

  const visibleNavItems = navItems.filter((item) => allowedTabs.includes(item.id));

  return (
    <aside 
      style={{
        width: isMobile ? '280px' : (isCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)'),
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0,
        padding: (!isMobile && isCollapsed) ? '16px 8px' : '18px 14px',
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: isMobile ? 1000 : 50,
        userSelect: 'none'
      }} 
      className={`sidebar-scroll ${isMobile ? 'sidebar-drawer-mobile' : ''} ${isMobile && isOpenMobile ? 'open' : ''}`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Sidebar Header Brand */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div 
            onClick={() => handleNavClick('dashboard')}
            role="button"
            tabIndex={0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: (!isMobile && isCollapsed) ? '0' : '8px',
              padding: (!isMobile && isCollapsed) ? '4px 0' : '4px 2px',
              cursor: 'pointer',
              justifyContent: (!isMobile && isCollapsed) ? 'center' : 'flex-start',
              flex: 1
            }}
            title="StockAI OS — Sri Vidhya Polymers"
          >
            {/* Brand Icon Tile */}
            <div style={{
              width: (!isMobile && isCollapsed) ? '36px' : '38px',
              height: (!isMobile && isCollapsed) ? '36px' : '38px',
              borderRadius: '10px',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              overflow: 'hidden',
              padding: '2px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              border: '1px solid #E2E8F0'
            }}>
              <img 
                src="/company-logo.jpg" 
                alt="Sri Vidhya Polymers" 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            </div>

            {/* Divider & Brand Text Lockup */}
            {(isMobile || !isCollapsed) && (
              <>
                <div style={{
                  width: '1px',
                  height: '30px',
                  background: '#CBD5E1',
                  flexShrink: 0,
                  margin: '0 2px'
                }} />
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ 
                    fontWeight: '900', 
                    fontSize: '15px', 
                    letterSpacing: '0.04em', 
                    color: '#0F172A',
                    lineHeight: 1.15
                  }}>
                    STOCKAI <span style={{ color: '#DC2626' }}>OS</span>
                  </div>
                  <div style={{ 
                    fontSize: '10px', 
                    color: '#64748B', 
                    letterSpacing: '-0.01em',
                    fontWeight: '600',
                    lineHeight: 1.3,
                    marginTop: '1px',
                    whiteSpace: 'nowrap'
                  }}>
                    Sri Vidhya Polymers · Manufacturing
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Close button for mobile drawer */}
          {isMobile && (
            <button
              onClick={onCloseMobile}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Close navigation"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Section Divider & Operations System Header */}
        {(isMobile || !isCollapsed) ? (
          <div style={{
            padding: '8px 6px 2px 6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--sidebar-border-subtle)',
            marginTop: '4px'
          }}>
            <span style={{
              fontSize: '10.5px',
              fontWeight: '700',
              textTransform: 'uppercase',
              color: 'var(--sidebar-text-muted)',
              letterSpacing: '0.08em',
              fontFamily: 'var(--font-mono)'
            }}>
              OPERATIONS SYSTEM
            </span>
            <span style={{
              fontSize: '9.5px',
              fontFamily: 'var(--font-mono)',
              padding: '1px 6px',
              borderRadius: '4px',
              background: 'rgba(6, 182, 212, 0.12)',
              color: 'var(--accent-cyan)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              fontWeight: '700',
              letterSpacing: '0.05em'
            }}>
              {roleConfig.badge || 'ADMIN'}
            </span>
          </div>
        ) : (
          <div style={{ borderTop: '1px solid var(--sidebar-border-subtle)', margin: '4px 0' }} />
        )}

        {/* Navigation List */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || 
              (item.id === 'dashboard' && (activeTab === 'dashboard-executive' || activeTab === 'dashboard-ai')) ||
              (item.id === 'logistics' && (activeTab === 'warehouse' || activeTab === 'stock-transfers'));

            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                title={(!isMobile && isCollapsed) ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: (!isMobile && isCollapsed) ? 'center' : 'space-between',
                  padding: (!isMobile && isCollapsed) ? '10px' : '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: isActive ? 'rgba(6, 182, 212, 0.35)' : 'transparent',
                  background: isActive ? 'var(--sidebar-item-active)' : 'transparent',
                  color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                  fontWeight: isActive ? '600' : '500',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                  textAlign: 'left',
                  position: 'relative',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--sidebar-item-hover)';
                    e.currentTarget.style.color = '#0F172A';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--sidebar-text)';
                  }
                }}
              >
                {/* Active Left Indicator Bar */}
                {isActive && (
                  <span style={{
                    position: 'absolute',
                    left: '0',
                    top: '6px',
                    bottom: '6px',
                    width: '3px',
                    backgroundColor: 'var(--accent-blue)',
                    borderRadius: '0 2px 2px 0'
                  }} />
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                  <Icon 
                    size={17} 
                    color={isActive ? 'var(--accent-blue)' : 'var(--sidebar-text-muted)'} 
                    style={{ flexShrink: 0 }}
                  />
                  {(isMobile || !isCollapsed) && (
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </span>
                  )}
                </div>

                {(isMobile || !isCollapsed) && item.badge && (
                  <span style={{
                    fontSize: '9.5px',
                    fontFamily: 'var(--font-mono)',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    background: isActive ? 'rgba(2, 132, 199, 0.1)' : '#F1F5F9',
                    color: isActive ? 'var(--accent-blue)' : 'var(--sidebar-text-muted)',
                    border: '1px solid',
                    borderColor: isActive ? '#BAE6FD' : '#E2E8F0',
                    fontWeight: '600',
                    letterSpacing: '0.04em'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Fixed Active Role Card */}
      {(isMobile || !isCollapsed) ? (
        <div style={{
          padding: '12px 14px',
          background: 'var(--sidebar-panel)',
          border: '1px solid var(--sidebar-border)',
          borderRadius: '8px',
          fontSize: '11.5px',
          display: 'flex',
          flexDirection: 'column',
          marginTop: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--sidebar-text-muted)', fontWeight: '500' }}>Active Role</span>
            <span className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: '700', fontSize: '11px' }}>
              {roleConfig.displayName}
            </span>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '10px 0',
          borderTop: '1px solid var(--sidebar-border-subtle)',
          color: 'var(--accent-cyan)'
        }} title={`Active Role: ${roleConfig.displayName}`}>
          <span className="font-mono" style={{ fontSize: '10px', fontWeight: '700' }}>
            {roleConfig.badge?.slice(0, 3) || 'ADM'}
          </span>
        </div>
      )}
    </aside>
  );
}

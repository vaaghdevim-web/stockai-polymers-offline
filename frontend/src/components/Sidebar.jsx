import React from 'react';
import { 
  LayoutDashboard, 
  Boxes, 
  Cpu, 
  FlaskConical, 
  Truck, 
  ShoppingCart,
  Building2,
  Settings,
  Bot 
} from 'lucide-react';
import { getPrimaryRoleConfig } from '../utils/rbac';

export default function Sidebar({ activeTab, onTabChange, userRoles = [] }) {
  const roleConfig = getPrimaryRoleConfig(userRoles);

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

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      background: 'var(--bg-panel)',
      borderRight: '1px solid var(--border-default)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      flexShrink: 0,
      padding: '12px 8px',
      overflowY: 'auto',
      overflowX: 'hidden',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{
          padding: '4px 10px 8px 10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{
            fontSize: '10.5px',
            fontWeight: '700',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            letterSpacing: '0.08em',
            fontFamily: 'var(--font-mono)'
          }}>
            Operations System
          </span>
          <span style={{
            fontSize: '9.5px',
            fontFamily: 'var(--font-mono)',
            padding: '1px 6px',
            borderRadius: 'var(--radius-xs)',
            background: 'rgba(0, 210, 255, 0.12)',
            color: 'var(--accent-cyan)',
            fontWeight: '700'
          }}>
            {roleConfig.badge}
          </span>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id || 
            (item.id === 'dashboard' && (activeTab === 'dashboard-executive' || activeTab === 'dashboard-ai')) ||
            (item.id === 'logistics' && activeTab === 'warehouse');

          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => onTabChange(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: isActive ? 'var(--border-strong)' : 'transparent',
                background: isActive ? 'var(--bg-surface)' : 'transparent',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontWeight: isActive ? '600' : '500',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.12s ease',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--bg-surface-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon size={15} color={isActive ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span style={{
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)',
                  padding: '1px 5px',
                  borderRadius: 'var(--radius-xs)',
                  background: isActive ? 'rgba(0, 210, 255, 0.15)' : 'var(--bg-input)',
                  color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  border: '1px solid',
                  borderColor: isActive ? 'rgba(0, 210, 255, 0.3)' : 'var(--border-subtle)'
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer System Status */}
      <div style={{
        padding: '10px 12px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        fontSize: '11px',
        color: 'var(--text-muted)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Active Role</span>
          <span className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}>{roleConfig.displayName}</span>
        </div>
      </div>
    </aside>
  );
}


import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  ChevronDown,
  LogOut 
} from 'lucide-react';
import { getCurrentUserProfile } from '../services/domain/adminService';
import { formatPlantName } from '../utils/brand';

export default function Header({ onOpenCommandPalette, roleConfig, onNavigate }) {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch full user profile on mount to get email, plant, etc.
  useEffect(() => {
    let isMounted = true;
    if (user) {
      getCurrentUserProfile()
        .then((res) => {
          if (isMounted && res.data) {
            setProfile(res.data);
          }
        })
        .catch(() => {
          // Fallback to authContext user
        });
    }
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileOpen]);

  const canViewAdmin = user?.roles?.some(r => 
    r === 'ADMIN' || r === 'SUPER_ADMIN' || r === 'ROLE_ADMIN' || r === 'ROLE_SUPER_ADMIN'
  );

  return (
    <header style={{
      height: 'var(--header-height)',
      background: 'var(--bg-panel)',
      borderBottom: '1px solid var(--border-default)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      zIndex: 100,
      flexShrink: 0
    }}>
      {/* Brand - Clickable to navigate to Control Room */}
      <div 
        id="header-brand-logo"
        onClick={() => onNavigate && onNavigate('dashboard')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (onNavigate) onNavigate('dashboard');
          }
        }}
        title="Control Room (Dashboard)"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
          userSelect: 'none',
          padding: '4px 6px',
          borderRadius: 'var(--radius-sm)',
          transition: 'opacity 0.15s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
      >
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: 'var(--radius-xs)',
          background: 'var(--accent-cyan)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#04090F',
          fontWeight: '800',
          fontFamily: 'var(--font-mono)',
          fontSize: '14px'
        }}>
          SVP
        </div>
        <div>
          <div style={{ fontWeight: '700', fontSize: '13px', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
            StockAI OS
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
            Sri Vidhya Polymers · Manufacturing Unit 1
          </div>
        </div>
      </div>

      {/* Center Search / Command Palette Trigger */}
      <div 
        onClick={onOpenCommandPalette}
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          padding: '5px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: 'var(--text-muted)',
          fontSize: '12.5px',
          cursor: 'pointer',
          width: '320px',
          transition: 'border-color 0.15s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-strong)'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-default)'}
      >
        <Search size={14} color="var(--text-muted)" />
        <span style={{ flex: 1 }}>Search Batch, SKU, Lot or Machine...</span>
        <kbd style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xs)',
          padding: '1px 5px',
          fontSize: '10px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-secondary)'
        }}>Ctrl+K</kbd>
      </div>

      {/* Right User Profile Dropdown & Actions */}
      <div style={{ position: 'relative' }} ref={dropdownRef}>
        <button
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          aria-expanded={isProfileOpen}
          aria-haspopup="true"
          title="Account Profile & Settings"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: isProfileOpen ? 'var(--bg-surface-active)' : 'transparent',
            border: '1px solid',
            borderColor: isProfileOpen ? 'var(--border-strong)' : 'transparent',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 8px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            if (!isProfileOpen) e.currentTarget.style.background = 'var(--bg-surface)';
          }}
          onMouseLeave={(e) => {
            if (!isProfileOpen) e.currentTarget.style.background = 'transparent';
          }}
        >
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-xs)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11.5px',
            fontWeight: '600',
            color: 'var(--accent-cyan)'
          }}>
            {user?.name?.slice(0, 2).toUpperCase() || 'AD'}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
              {user?.name || 'Operator'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontWeight: '600' }}>
              {roleConfig?.displayName || user?.roles?.[0] || 'SUPER_ADMIN'}
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

        {/* Profile Dropdown Popover */}
        {isProfileOpen && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '260px',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-lg)',
            padding: '14px',
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
              paddingBottom: '8px'
            }}>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                letterSpacing: '0.05em',
                fontFamily: 'var(--font-mono)'
              }}>
                User Profile
              </span>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '10.5px',
                color: 'var(--accent-emerald)',
                fontFamily: 'var(--font-mono)',
                fontWeight: '600'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-emerald)' }} />
                Active
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Username</div>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {user?.name || profile?.userName || 'Operator'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Email</div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '2px', wordBreak: 'break-all', fontSize: '11.5px' }}>
                  {profile?.email || user?.email || 'admin@stockai.internal'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Role</div>
                <div style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontWeight: '600', marginTop: '2px' }}>
                  {roleConfig?.displayName || (user?.roles && user.roles.join(', ')) || 'OPERATOR'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Plant</div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {formatPlantName(profile?.plantName)}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '8px',
              marginTop: '4px',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '10px'
            }}>
              {canViewAdmin && (
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    if (onNavigate) onNavigate('admin');
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, fontSize: '11px', justifyContent: 'center' }}
                >
                  View Profile
                </button>
              )}
              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  logout();
                }}
                className="btn btn-ghost btn-sm"
                style={{
                  flex: canViewAdmin ? 1 : 'none',
                  width: canViewAdmin ? 'auto' : '100%',
                  fontSize: '11px',
                  justifyContent: 'center',
                  color: 'var(--accent-coral)'
                }}
              >
                <LogOut size={13} style={{ marginRight: '4px' }} /> Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

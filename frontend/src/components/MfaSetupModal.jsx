import React from 'react';
import { X, ShieldAlert, KeyRound, Info } from 'lucide-react';

export default function MfaSetupModal({ isOpen, onClose, user }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
        background: '#FFFFFF', borderRadius: '12px', maxWidth: '460px', width: '100%',
        padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7'
            }}>
              <KeyRound size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                Two-Factor Authentication (MFA)
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                RFC 6238 TOTP Authenticator Service
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Notice banner */}
        <div style={{
          padding: '12px 14px',
          background: '#F8FAFC',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284C7', fontWeight: '600', fontSize: '13px' }}>
            <Info size={16} />
            <span>MFA Provisioning Notice</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            Dynamic self-enrollment for TOTP is not exposed via public API endpoints. Multi-factor authentication credentials are provisioned by enterprise administrators directly via corporate security policy.
          </p>
        </div>

        {/* User security status */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Account Identity:</span>
            <span className="font-mono" style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
              {user?.email || user?.userName || user?.name || 'Administrator'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Enforcement Policy:</span>
            <span style={{ fontWeight: '600', color: '#059669' }}>
              Required for Admin / Factory Director Roles
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>MFA Status:</span>
            <span className="badge badge-emerald">
              Managed By Administrator
            </span>
          </div>
        </div>

        <button onClick={onClose} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          Close
        </button>
      </div>
    </div>
  );
}

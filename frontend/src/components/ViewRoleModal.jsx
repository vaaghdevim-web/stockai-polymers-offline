import React from 'react';
import { X, Shield, Users, Lock, CheckCircle2 } from 'lucide-react';

export default function ViewRoleModal({ isOpen, onClose, role }) {
  if (!isOpen || !role) return null;

  const isSystem = role.isSystemRole || role.roleName === 'ADMIN' || role.roleName === 'SUPER_ADMIN';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        width: '100%',
        maxWidth: '520px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-xl)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
              Enterprise Role Specifications
            </h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px', color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          {/* Identity Card */}
          <div style={{
            padding: '14px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  {role.displayName || role.roleName}
                </span>
                {isSystem && (
                  <span style={{
                    fontSize: '9.5px',
                    fontFamily: 'var(--font-mono)',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-xs)',
                    background: 'rgba(0, 210, 255, 0.12)',
                    border: '1px solid rgba(0, 210, 255, 0.3)',
                    color: 'var(--accent-cyan)',
                    fontWeight: '700'
                  }}>
                    SYSTEM ROLE
                  </span>
                )}
              </div>
              <span className="font-mono" style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: '700' }}>
                ROLE_{role.roleName}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                padding: '3px 8px',
                borderRadius: 'var(--radius-xs)',
                background: role.isActive !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: role.isActive !== false ? 'var(--accent-emerald)' : 'var(--accent-coral)',
                fontWeight: '700'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                {role.isActive !== false ? 'ACTIVE' : 'DEACTIVATED'}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Domain & Scope Description
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {role.description || 'No description provided.'}
            </div>
          </div>

          {/* User Assignments */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
            <Users size={15} color="var(--accent-cyan)" />
            <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
              Active Assigned Users: <strong className="font-mono">{role.userCount || 0}</strong>
            </span>
          </div>

          {/* Assigned Permissions */}
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Assigned Authority Grants ({role.permissions?.length || 0})
            </div>
            {(!role.permissions || role.permissions.length === 0) ? (
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Default Spring Security authority matching ROLE_{role.roleName} applied authoritatively.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {role.permissions.map((perm, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '3px 8px',
                      background: 'rgba(0, 210, 255, 0.08)',
                      border: '1px solid rgba(0, 210, 255, 0.2)',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--accent-cyan)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <CheckCircle2 size={11} /> {perm}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

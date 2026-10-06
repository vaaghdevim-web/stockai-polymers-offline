import React, { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { deleteEnterpriseRole, extractErrorMessage } from '../services/domain/adminService';

export default function DeleteRoleModal({ isOpen, onClose, role, onRoleDeleted }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !role) return null;

  const isSystemRole = role.isSystemRole || role.roleName === 'ADMIN' || role.roleName === 'SUPER_ADMIN';
  const hasAssignedUsers = (role.userCount || 0) > 0;
  const isDeletable = !isSystemRole && !hasAssignedUsers;

  const handleConfirm = async () => {
    if (!isDeletable) return;

    setLoading(true);
    setError(null);

    try {
      await deleteEnterpriseRole(role.roleId);
      if (onRoleDeleted) {
        onRoleDeleted(role.roleId);
      }
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to remove role.'));
    } finally {
      setLoading(false);
    }
  };

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
        maxWidth: '460px',
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
            <AlertTriangle size={18} color="var(--accent-coral)" />
            <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
              Confirm Role Removal
            </h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px', color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{
              padding: '10px 12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--accent-coral)',
              fontSize: '12px'
            }}>
              {error}
            </div>
          )}

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Are you sure you want to remove the enterprise role{' '}
            <strong className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{role.roleName}</strong>{' '}
            ({role.displayName}) from the active registry?
          </p>

          {isSystemRole && (
            <div style={{
              padding: '10px 12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 'var(--radius-xs)',
              fontSize: '11.5px',
              color: 'var(--accent-coral)',
              lineHeight: 1.5
            }}>
              <strong>Protected System Role:</strong> System administrator roles (ADMIN, SUPER_ADMIN) are required for platform operations and security, and cannot be deleted.
            </div>
          )}

          {!isSystemRole && hasAssignedUsers && (
            <div style={{
              padding: '10px 12px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: 'var(--radius-xs)',
              fontSize: '11.5px',
              color: 'var(--accent-amber)',
              lineHeight: 1.5
            }}>
              <strong>Active Assignments Detected:</strong> This role is currently assigned to{' '}
              <strong>{role.userCount}</strong> active user account(s). Please reassign or unassign these users before removing the role.
            </div>
          )}

          {!isSystemRole && !hasAssignedUsers && (
            <div style={{
              padding: '10px 12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xs)',
              fontSize: '11.5px',
              color: 'var(--text-muted)',
              lineHeight: 1.5
            }}>
              Soft-deletion will deactivate this role. Existing audit trails and historical transaction logs will remain intact.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px'
        }}>
          <button type="button" onClick={onClose} disabled={loading} className="btn btn-secondary btn-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || !isDeletable}
            className="btn btn-sm"
            style={{
              background: isDeletable ? 'var(--accent-coral)' : 'var(--bg-panel)',
              color: isDeletable ? '#fff' : 'var(--text-muted)',
              border: '1px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: isDeletable ? 'pointer' : 'not-allowed',
              opacity: isDeletable ? 1 : 0.6
            }}
          >
            <Trash2 size={13} /> {loading ? 'Removing...' : 'Confirm Removal'}
          </button>
        </div>
      </div>
    </div>
  );
}

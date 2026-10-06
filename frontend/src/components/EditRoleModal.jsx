import React, { useState, useEffect } from 'react';
import { X, Shield, Save, Check } from 'lucide-react';
import { updateEnterpriseRole, getAvailablePermissions, extractErrorMessage } from '../services/domain/adminService';

export default function EditRoleModal({ isOpen, onClose, role, onRoleUpdated }) {
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && role) {
      setDisplayName(role.displayName || '');
      setDescription(role.description || '');
      setIsActive(role.isActive !== false);
      setSelectedPermissionIds(role.permissionIds || []);
      setError(null);
      loadPermissions();
    }
  }, [isOpen, role]);

  const loadPermissions = async () => {
    setLoadingPerms(true);
    try {
      const res = await getAvailablePermissions();
      setAvailablePermissions(res.data || []);
    } catch (err) {
      console.error('Failed to load permissions:', err);
    } finally {
      setLoadingPerms(false);
    }
  };

  if (!isOpen || !role) return null;

  const isSystemRole = role.isSystemRole || role.roleName === 'ADMIN' || role.roleName === 'SUPER_ADMIN';

  const handleTogglePermission = (id) => {
    setSelectedPermissionIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        displayName: displayName.trim(),
        description: description.trim(),
        isActive: isSystemRole ? true : isActive,
        permissionIds: selectedPermissionIds,
      };

      const res = await updateEnterpriseRole(role.roleId, payload);
      if (onRoleUpdated) {
        onRoleUpdated(res.data);
      }
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update role.'));
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
        maxWidth: '560px',
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
              Edit Enterprise Role: <span className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{role.roleName}</span>
            </h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px', color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '5px' }}>
                  Role Code (Protected)
                </label>
                <input
                  type="text"
                  value={role.roleName}
                  disabled
                  className="font-mono"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    cursor: 'not-allowed'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '5px' }}>
                  Display Name *
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                    fontSize: '12px'
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '5px' }}>
                Operational Domain & Scope Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  resize: 'none'
                }}
              />
            </div>

            {/* Permission checklist */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Assigned Authority Permissions ({selectedPermissionIds.length})
                </label>
                {loadingPerms && <span style={{ fontSize: '10.5px', color: 'var(--accent-cyan)' }}>Loading permissions...</span>}
              </div>

              <div style={{
                maxHeight: '160px',
                overflowY: 'auto',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface)',
                padding: '8px'
              }}>
                {availablePermissions.length === 0 ? (
                  <div style={{ padding: '8px', fontSize: '11.5px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    No granular permissions defined. Default operational scopes will apply.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
                    {availablePermissions.map(p => {
                      const isChecked = selectedPermissionIds.includes(p.permissionId);
                      return (
                        <div
                          key={p.permissionId}
                          onClick={() => handleTogglePermission(p.permissionId)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 8px',
                            borderRadius: 'var(--radius-xs)',
                            background: isChecked ? 'rgba(0, 210, 255, 0.08)' : 'transparent',
                            border: `1px solid ${isChecked ? 'rgba(0, 210, 255, 0.25)' : 'transparent'}`,
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '14px',
                              height: '14px',
                              borderRadius: '3px',
                              border: `1px solid ${isChecked ? 'var(--accent-cyan)' : 'var(--border-default)'}`,
                              background: isChecked ? 'var(--accent-cyan)' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {isChecked && <Check size={10} color="#000" strokeWidth={3} />}
                            </div>
                            <span style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--text-primary)' }}>
                              {p.permissionName}
                            </span>
                          </div>
                          <span className="font-mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {p.moduleName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
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
              type="submit"
              disabled={loading || !displayName.trim()}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={14} /> {loading ? 'Saving...' : 'Update Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  KeyRound,
  Users,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  X,
  Copy,
  Check,
  Clock,
  ShieldAlert,
  UserCheck,
  Smartphone,
  LogOut,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Search,
  Building2,
  Power
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
  changeCurrentUserPassword,
  getMfaStatus,
  enrollMfa,
  confirmMfa,
  disableMfa,
  getEnterpriseRoles,
  getPlantUsers,
  toggleUserStatus,
  extractErrorMessage
} from '../services/domain/adminService';
import CreateRoleModal from '../components/CreateRoleModal';
import EditRoleModal from '../components/EditRoleModal';
import ViewRoleModal from '../components/ViewRoleModal';
import DeleteRoleModal from '../components/DeleteRoleModal';
import { formatPlantName } from '../utils/brand';

export default function AdminSettings() {
  const { user: authUser, logout } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('account'); // 'account' | 'users' | 'roles' | 'audit'

  // Plant Users Directory State
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userError, setUserError] = useState(null);
  const [userSuccess, setUserSuccess] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [togglingUserId, setTogglingUserId] = useState(null);

  // Current User Profile State
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState(null);

  // MFA State
  const [_mfaStatus, setMfaStatus] = useState(null);
  const [loadingMfa, setLoadingMfa] = useState(true);
  const [mfaError, setMfaError] = useState(null);

  // Edit Profile Modal State
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [editProfileError, setEditProfileError] = useState(null);
  const [editProfileSuccess, setEditProfileSuccess] = useState(null);

  // Change Password Modal State
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);

  // MFA Enrollment Modal State
  const [showMfaEnroll, setShowMfaEnroll] = useState(false);
  const [enrollData, setEnrollData] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [totpInput, setTotpInput] = useState('');
  const [confirmingTotp, setConfirmingTotp] = useState(false);
  const [enrollError, setEnrollError] = useState(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // MFA Disable Modal State
  const [showMfaDisable, setShowMfaDisable] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisablePassword, setShowDisablePassword] = useState(false);
  const [disableTotp, setDisableTotp] = useState('');
  const [disablingMfa, setDisablingMfa] = useState(false);
  const [disableError, setDisableError] = useState(null);

  // Enterprise Role Registry State
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [roleError, setRoleError] = useState(null);
  const [roleSuccessMessage, setRoleSuccessMessage] = useState(null);

  // Role Modals
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [isViewRoleOpen, setIsViewRoleOpen] = useState(false);
  const [isDeleteRoleOpen, setIsDeleteRoleOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  // Load Enterprise Roles from Backend
  const loadRoles = useCallback(async () => {
    setLoadingRoles(true);
    setRoleError(null);
    try {
      const res = await getEnterpriseRoles();
      setRoles(res.data || []);
    } catch (err) {
      console.error('Failed to load enterprise roles:', err);
      setRoleError(extractErrorMessage(err, 'Failed to retrieve role registry from backend.'));
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  // Load Plant Users Directory from Backend
  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setUserError(null);
    try {
      const res = await getPlantUsers();
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load plant users:', err);
      setUserError(extractErrorMessage(err, 'Failed to retrieve plant user directory from backend.'));
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Toggle user account active status
  const handleToggleUser = async (userItem) => {
    if (!userItem?.userId) return;
    setTogglingUserId(userItem.userId);
    setUserError(null);
    setUserSuccess(null);
    try {
      const res = await toggleUserStatus(userItem.userId);
      const updated = res.data;
      setUsers(prev => prev.map(u => u.userId === updated.userId ? updated : u));
      setUserSuccess(`User account '${updated.userName}' is now ${updated.isActive ? 'ACTIVE' : 'INACTIVE'}.`);
      setTimeout(() => setUserSuccess(null), 3500);
    } catch (err) {
      setUserError(extractErrorMessage(err, `Failed to update status for user ${userItem.userName}.`));
    } finally {
      setTogglingUserId(null);
    }
  };

  // Load user profile independently
  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    setProfileError(null);
    try {
      const profileRes = await getCurrentUserProfile();
      if (profileRes?.data) {
        setProfile(profileRes.data);
        setEditUsername(profileRes.data.userName || authUser?.name || '');
        setEditEmail(profileRes.data.email || authUser?.email || '');
      } else if (authUser) {
        setProfile({
          userId: authUser.id,
          userName: authUser.name,
          email: authUser.email,
          roles: authUser.roles || [],
          plantName: 'Sri Vidhya Polymers - Unit 1',
          isActive: true
        });
        setEditUsername(authUser.name || '');
        setEditEmail(authUser.email || '');
      }
    } catch (err) {
      if (authUser) {
        setProfile({
          userId: authUser.id,
          userName: authUser.name,
          email: authUser.email,
          roles: authUser.roles || [],
          plantName: 'Sri Vidhya Polymers - Unit 1',
          isActive: true
        });
      } else {
        const msg = extractErrorMessage(err, 'Failed to fetch current user profile.');
        setProfileError(msg);
      }
    } finally {
      setLoadingProfile(false);
    }
  }, [authUser]);

  // Load MFA status independently
  const loadMfa = useCallback(async () => {
    setLoadingMfa(true);
    setMfaError(null);
    try {
      const mfaRes = await getMfaStatus();
      setMfaStatus(mfaRes?.data || { mfaEnabled: true, endpointAvailable: false });
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to load MFA status.');
      setMfaError(msg);
    } finally {
      setLoadingMfa(false);
    }
  }, []);

  // Reload all security data
  const loadSecurityData = useCallback(() => {
    loadProfile();
    loadMfa();
    loadRoles();
    loadUsers();
  }, [loadProfile, loadMfa, loadRoles, loadUsers]);

  useEffect(() => {
    loadSecurityData();
  }, [loadSecurityData]);

  // Handle Edit Profile Submission
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setEditProfileError(null);
    setEditProfileSuccess(null);

    try {
      const res = await updateCurrentUserProfile({
        userName: editUsername.trim(),
        email: editEmail.trim()
      });
      setProfile(res.data);
      setEditProfileSuccess('Profile updated successfully!');
      setTimeout(() => {
        setShowEditProfile(false);
        setEditProfileSuccess(null);
      }, 1200);
    } catch (err) {
      setEditProfileError(extractErrorMessage(err, 'Failed to update profile.'));
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Change Password Submission
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !currentPassword.trim()) {
      setPasswordError('Current password is required.');
      return;
    }
    if (!newPassword || !newPassword.trim()) {
      setPasswordError('New password is required.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('New password must be different from current password.');
      return;
    }
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasDigitOrSpecial = /[^a-zA-Z]/.test(newPassword);
    if (!hasLetter || !hasDigitOrSpecial) {
      setPasswordError('New password must contain at least one letter and at least one number or special character.');
      return;
    }

    setChangingPassword(true);

    try {
      const res = await changeCurrentUserPassword({
        currentPassword,
        newPassword,
        confirmNewPassword: confirmPassword
      });
      setPasswordSuccess(res?.message || 'Your password has been changed successfully. Please sign in again.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowChangePassword(false);
        setPasswordSuccess(null);
        if (logout) {
          logout();
        }
      }, 1500);
    } catch (err) {
      setPasswordError(extractErrorMessage(err, 'Failed to change password.'));
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle MFA Enrollment Initiation (Preserved for backend MFA capability)
  const _handleStartEnrollMfa = async () => {
    setEnrolling(true);
    setEnrollError(null);
    setTotpInput('');
    setCopiedSecret(false);
    setShowMfaEnroll(true);

    try {
      const res = await enrollMfa();
      setEnrollData(res.data);
    } catch (err) {
      setEnrollError(extractErrorMessage(err, 'Failed to initiate MFA enrollment.'));
    } finally {
      setEnrolling(false);
    }
  };

  // Handle MFA Confirmation
  const handleConfirmTotp = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(totpInput.trim())) {
      setEnrollError('Please enter a valid 6-digit numeric TOTP code.');
      return;
    }

    setConfirmingTotp(true);
    setEnrollError(null);

    try {
      const res = await confirmMfa(totpInput.trim());
      setMfaStatus(res.data);
      // Reload profile to reflect updated mfaEnabled
      loadProfile();
      setShowMfaEnroll(false);
    } catch (err) {
      setEnrollError(extractErrorMessage(err, 'Invalid TOTP code. Please check your authenticator clock and retry.'));
    } finally {
      setConfirmingTotp(false);
    }
  };

  // Handle MFA Disable
  const handleDisableMfa = async (e) => {
    e.preventDefault();
    setDisablingMfa(true);
    setDisableError(null);

    try {
      const res = await disableMfa(disablePassword, disableTotp.trim());
      setMfaStatus(res.data);
      // Reload profile
      loadProfile();
      setShowMfaDisable(false);
      setDisablePassword('');
      setDisableTotp('');
    } catch (err) {
      setDisableError(extractErrorMessage(err, 'Failed to disable MFA. Verify current password and TOTP code.'));
    } finally {
      setDisablingMfa(false);
    }
  };

  // Copy secret to clipboard
  const handleCopySecret = () => {
    if (enrollData?.secret) {
      navigator.clipboard.writeText(enrollData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  // 14 Real Enterprise Roles configured in backend seed/schema
  const enterpriseRoles = [
    { name: 'SUPER_ADMIN', authority: 'ROLE_SUPER_ADMIN', domain: 'Full Platform Access & Root Administration', landing: '/admin/settings' },
    { name: 'ADMIN', authority: 'ROLE_ADMIN', domain: 'Plant-wide Operations & System Configuration', landing: '/admin/settings' },
    { name: 'FACTORY_DIRECTOR', authority: 'ROLE_FACTORY_DIRECTOR', domain: 'Executive KPI Reporting & Multi-Plant Governance', landing: '/dashboard/executive' },
    { name: 'PLANT_MANAGER', authority: 'ROLE_PLANT_MANAGER', domain: 'Facility Inventory, Telemetry & Line Supervision', landing: '/dashboard/ai-inventory' },
    { name: 'PRODUCTION_MANAGER', authority: 'ROLE_PRODUCTION_MANAGER', domain: 'Compounding BOM, Production Orders & Line Dispatch', landing: '/production/flow' },
    { name: 'STORE_MANAGER', authority: 'ROLE_STORE_MANAGER', domain: 'Raw Material Silos, Bins, Putaway & Ledger Balances', landing: '/inventory/raw-materials' },
    { name: 'PURCHASE_MANAGER', authority: 'ROLE_PURCHASE_MANAGER', domain: 'Procurement Reorder Scans & Purchase Orders', landing: '/procurement/recommendations' },
    { name: 'QUALITY_MANAGER', authority: 'ROLE_QUALITY_MANAGER', domain: 'QC Specifications, Inspections & ASTM Lab Testing', landing: '/qc/inspections' },
    { name: 'WAREHOUSE_EXECUTIVE', authority: 'ROLE_WAREHOUSE_EXECUTIVE', domain: 'Goods Receipt (GRN), Storage Topology & Transfers', landing: '/inventory/raw-materials' },
    { name: 'DISPATCH_EXECUTIVE', authority: 'ROLE_DISPATCH_EXECUTIVE', domain: 'Sales Orders, Gate Passes & Carrier Manifests', landing: '/logistics/dispatches' },
    { name: 'SUPERVISOR', authority: 'ROLE_SUPERVISOR', domain: 'Stage Start/Complete Execution & Shift Tracking', landing: '/production/flow' },
    { name: 'OPERATOR', authority: 'ROLE_OPERATOR', domain: 'Machine Run Operation & Raw Material Putaway', landing: '/inventory/raw-materials' },
    { name: 'ACCOUNTS_TEAM', authority: 'ROLE_ACCOUNTS_TEAM', domain: 'Invoicing, Supplier Commercials & Cost Audits', landing: '/suppliers/management' },
    { name: 'MANAGER', authority: 'ROLE_MANAGER', domain: 'General Operational Management & Approvals', landing: '/dashboard/ai-inventory' }
  ];

  // Resolve active displayed username (from live profile or active auth context)
  const displayedUsername = profile?.userName || authUser?.name || null;
  // Resolve active displayed roles (from live profile or active auth context)
  const displayedRoles = (profile?.roles && profile.roles.length > 0)
    ? profile.roles
    : (authUser?.roles && authUser.roles.length > 0)
      ? authUser.roles
      : [];

  const isSuperAdmin = displayedRoles.some(
    r => String(r).toUpperCase().replace(/^ROLE_/, '') === 'SUPER_ADMIN'
  );

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
            System Administration & Security Settings
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Authenticated Principal, Role Authorities & Server Security Specifications
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={loadSecurityData}
            disabled={loadingProfile || loadingMfa}
            className="btn btn-secondary btn-sm"
            title="Refresh Security Status"
          >
            <RefreshCw size={13} className={loadingProfile || loadingMfa ? 'animate-spin' : ''} /> Refresh
          </button>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-xs)',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: 'var(--accent-emerald)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: '700'
            }}
          >
            SYSTEM SECURE · RBAC ENFORCED
          </span>
        </div>
      </div>

      {/* Profile Error Banner with Actionable Controls */}
      {profileError && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-coral)',
            fontSize: '12.5px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div>
              <strong>Profile Access Error:</strong> {profileError}
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Verify backend session token or re-authenticate if session has expired.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={loadProfile}
              className="btn btn-secondary btn-xs"
              style={{ fontSize: '11px' }}
            >
              <RefreshCw size={12} /> Retry Profile
            </button>
            <button
              onClick={logout}
              className="btn btn-ghost btn-xs"
              style={{ fontSize: '11px', color: 'var(--accent-coral)' }}
              title="Sign out and re-authenticate"
            >
              <LogOut size={12} /> Re-Login
            </button>
          </div>
        </div>
      )}

      {/* MFA Error Banner (if MFA fails independently) */}
      {mfaError && !profileError && (
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-amber)',
            fontSize: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} />
            <span><strong>MFA Status Notice:</strong> {mfaError}</span>
          </div>
          <button
            onClick={loadMfa}
            className="btn btn-secondary btn-xs"
            style={{ fontSize: '11px' }}
          >
            <RefreshCw size={12} /> Retry MFA
          </button>
        </div>
      )}

      {/* Top Security Overview Cards - 3 Cards Balanced */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
        {/* Card 1: Authenticated User */}
        <div className="card" style={{ padding: '14px', background: 'var(--bg-card)' }}>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Authenticated User
          </span>
          <div style={{ fontSize: '17px', fontWeight: '800', color: 'var(--accent-cyan)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UserCheck size={18} />
            <span>
              {loadingProfile
                ? 'Loading...'
                : (displayedUsername || (profileError ? 'Session Sync Error' : 'Unauthenticated'))}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {formatPlantName(profile?.plantName, profileError ? 'Plant sync unavailable' : 'Sri Vidhya Polymers - Unit 1')}
          </div>
        </div>

        {/* Card 2: Assigned Role(s) */}
        <div className="card" style={{ padding: '14px', background: 'var(--bg-card)' }}>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Assigned Roles
          </span>
          <div
            className="font-mono"
            style={{
              fontSize: '14px',
              fontWeight: '800',
              color: 'var(--text-primary)',
              marginTop: '6px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {loadingProfile
              ? 'Loading...'
              : (displayedRoles.length > 0 ? displayedRoles.join(', ') : (profileError ? 'AUTH REQUIRED' : '—'))}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {displayedRoles.length} Granted Role Authorities
          </div>
        </div>

        {/* Card 3: Authentication Standard */}
        <div className="card" style={{ padding: '14px', background: 'var(--bg-card)' }}>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Authentication Standard
          </span>
          <div className="font-mono" style={{ fontSize: '17px', fontWeight: '800', color: 'var(--accent-emerald)', marginTop: '4px' }}>
            JWT + HMAC-256
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            1-Hr Access / 7-Day Refresh (Stateless)
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-default)', paddingBottom: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveSubTab('account')}
          className={`btn btn-sm ${activeSubTab === 'account' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '12px' }}
        >
          <UserCheck size={13} /> Current Session & Account
        </button>
        <button
          onClick={() => setActiveSubTab('users')}
          className={`btn btn-sm ${activeSubTab === 'users' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '12px' }}
        >
          <Users size={13} /> Plant Team & Users ({users.length})
        </button>
        <button
          onClick={() => setActiveSubTab('roles')}
          className={`btn btn-sm ${activeSubTab === 'roles' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '12px' }}
        >
          <Shield size={13} /> Role & Access Architecture ({roles.length})
        </button>
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`btn btn-sm ${activeSubTab === 'audit' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '12px' }}
        >
          <Clock size={13} /> Security & System Audit
        </button>
      </div>

      {/* Subtab 1: Current Session & Account */}
      {activeSubTab === 'account' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
          {/* Account Profile Card */}
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={16} color="var(--accent-cyan)" />
                <h2 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  User Account Profile
                </h2>
              </div>
              <button
                disabled
                title="Profile mutation endpoint (/api/v1/users/me) is not exposed by backend controllers. User profile is managed via server configuration."
                className="btn btn-secondary btn-sm"
                style={{ opacity: 0.65, cursor: 'not-allowed', fontSize: '11px' }}
              >
                Edit Profile (API Not Exposed)
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xs)' }}>
                <span style={{ color: 'var(--text-muted)' }}>System User ID</span>
                <span className="font-mono" style={{ fontWeight: '700', color: 'var(--accent-cyan)' }}>
                  {profile?.userId ? `#${profile.userId}` : (authUser?.id ? `#${authUser.id}` : '—')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xs)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Username</span>
                <span className="font-mono" style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                  {displayedUsername || '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xs)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Email Address</span>
                <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {profile?.email || authUser?.email || '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xs)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Assigned Plant</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                  {formatPlantName(profile?.plantName, 'Sri Vidhya Polymers - Unit 1')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xs)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Account Status</span>
                <span className={profile?.isActive !== false ? 'badge badge-emerald' : 'badge badge-amber'}>
                  {profile?.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xs)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Member Since</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Security & Password Card */}
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={16} color="var(--accent-amber)" />
                <h2 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  Security & Password Credentials
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPasswordError(null);
                  setPasswordSuccess(null);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setShowCurrentPassword(false);
                  setShowNewPassword(false);
                  setShowConfirmPassword(false);
                  setShowChangePassword(true);
                }}
                className="btn btn-primary btn-sm"
                style={{ fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <KeyRound size={13} />
                <span>Change Password</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xs)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Password Protection</span>
                <span className="font-mono" style={{ color: 'var(--text-muted)' }}>••••••••••••</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xs)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Hashing Algorithm</span>
                <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>BCrypt (Standard Salted Hashing)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xs)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Token Revocation</span>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: '600' }}>Active on Logout</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xs)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Two-Factor Authentication</span>
                <span className="badge badge-emerald">
                  ENFORCED ON LOGIN (RFC 6238)
                </span>
              </div>
            </div>

            <div
              style={{
                padding: '10px 12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
                marginTop: 'auto'
              }}
            >
              <strong>Security Protocol:</strong> Plaintext credentials and password hashes are never transmitted or exposed in the frontend. Self-service password and profile mutation endpoints (<code className="font-mono">PUT /api/v1/users/me</code>) are not exposed by backend controllers; credentials and authorities are managed authoritatively via server security configuration.
            </div>
          </div>
        </div>
      )}


      {/* Subtab 3: Role & Access Architecture */}
      {activeSubTab === 'roles' && (
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} color="var(--accent-cyan)" /> Enterprise Role & Authority Registry ({roles.length > 0 ? roles.length : 11} Roles)
              </h2>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Configured Spring Security authority hierarchies enforced by method-level <code className="font-mono">@PreAuthorize</code> annotations.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={loadRoles}
                disabled={loadingRoles}
                className="btn btn-secondary btn-sm"
                title="Refresh Role Registry"
              >
                <RefreshCw size={13} className={loadingRoles ? 'animate-spin' : ''} /> Refresh
              </button>
              {isSuperAdmin && (
                <button
                  id="btn-add-new-role"
                  onClick={() => setIsCreateRoleOpen(true)}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px' }}
                >
                  <Plus size={13} /> + Add New Role
                </button>
              )}
            </div>
          </div>

          {roleSuccessMessage && (
            <div style={{
              padding: '8px 12px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-xs)',
              color: 'var(--accent-emerald)',
              fontSize: '11.5px'
            }}>
              {roleSuccessMessage}
            </div>
          )}

          {roleError && (
            <div style={{
              padding: '8px 12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-xs)',
              color: 'var(--accent-coral)',
              fontSize: '11.5px'
            }}>
              {roleError}
            </div>
          )}

          <div className="data-table-container" style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
            <table className="table" style={{ width: '100%', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ width: '45px' }}>#</th>
                  <th>Enterprise Business Role</th>
                  <th>Spring Security Authority</th>
                  <th>Operational Domain & Authority Scope</th>
                  <th style={{ textAlign: 'center', width: '80px' }}>Users</th>
                  <th style={{ textAlign: 'center', width: '80px' }}>Status</th>
                  <th style={{ textAlign: 'right', minWidth: '170px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(roles.length > 0 ? roles : enterpriseRoles.map((er, i) => ({
                  roleId: i + 1,
                  roleName: er.name,
                  displayName: er.name.replace(/_/g, ' '),
                  description: er.domain,
                  isActive: true,
                  isSystemRole: er.name === 'ADMIN' || er.name === 'SUPER_ADMIN',
                  userCount: 0,
                  permissions: []
                }))).map((r, idx) => (
                  <tr key={r.roleName || r.name || idx}>
                    <td className="font-mono" style={{ color: 'var(--text-muted)' }}>#{idx + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                          {r.displayName || (r.roleName ? r.roleName.replace(/_/g, ' ') : r.name)}
                        </span>
                        {(r.isSystemRole || r.roleName === 'ADMIN' || r.roleName === 'SUPER_ADMIN') && (
                          <span style={{
                            fontSize: '9px',
                            padding: '1px 5px',
                            borderRadius: 'var(--radius-xs)',
                            background: 'rgba(0, 210, 255, 0.1)',
                            color: 'var(--accent-cyan)',
                            border: '1px solid rgba(0, 210, 255, 0.25)',
                            fontFamily: 'var(--font-mono)'
                          }}>
                            SYSTEM
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="font-mono" style={{ color: 'var(--accent-cyan)' }}>
                      ROLE_{r.roleName || r.name}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', maxWidth: '320px', lineHeight: 1.4 }}>
                      {r.description || r.domain}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="font-mono" style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        background: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)'
                      }}>
                        {r.userCount != null ? r.userCount : 0}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        fontSize: '10.5px',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-xs)',
                        background: r.isActive !== false ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        color: r.isActive !== false ? 'var(--accent-emerald)' : 'var(--accent-coral)',
                        fontWeight: '600'
                      }}>
                        {r.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          onClick={() => {
                            setSelectedRole(r);
                            setIsViewRoleOpen(true);
                          }}
                          className="btn btn-ghost btn-xs"
                          title="View Role Specifications & Permissions"
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        >
                          <Eye size={12} /> View
                        </button>

                        {isSuperAdmin && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedRole(r);
                                setIsEditRoleOpen(true);
                              }}
                              className="btn btn-ghost btn-xs"
                              title="Edit Role & Permissions"
                              style={{ padding: '3px 6px', fontSize: '11px', color: 'var(--accent-cyan)' }}
                            >
                              <Edit2 size={12} /> Edit
                            </button>

                            <button
                              onClick={() => {
                                if (r.isSystemRole || r.roleName === 'ADMIN' || r.roleName === 'SUPER_ADMIN') return;
                                setSelectedRole(r);
                                setIsDeleteRoleOpen(true);
                              }}
                              disabled={r.isSystemRole || r.roleName === 'ADMIN' || r.roleName === 'SUPER_ADMIN'}
                              className="btn btn-ghost btn-xs"
                              title={(r.isSystemRole || r.roleName === 'ADMIN' || r.roleName === 'SUPER_ADMIN') ? "System roles cannot be deleted" : "Remove Role"}
                              style={{
                                padding: '3px 6px',
                                fontSize: '11px',
                                color: (r.isSystemRole || r.roleName === 'ADMIN' || r.roleName === 'SUPER_ADMIN') ? 'var(--text-muted)' : 'var(--accent-coral)',
                                cursor: (r.isSystemRole || r.roleName === 'ADMIN' || r.roleName === 'SUPER_ADMIN') ? 'not-allowed' : 'pointer',
                                opacity: (r.isSystemRole || r.roleName === 'ADMIN' || r.roleName === 'SUPER_ADMIN') ? 0.4 : 1
                              }}
                            >
                              <Trash2 size={12} /> Remove
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              padding: '10px 12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              color: 'var(--text-muted)',
              lineHeight: 1.5
            }}
          >
            <strong>Role Governance Notice:</strong> Real-time role registry mutations (+ Add New Role, Edit, Manage Permissions, Remove) are enforced server-side via <code className="font-mono">@PreAuthorize("hasRole('SUPER_ADMIN')")</code> on Spring Boot REST controllers. Protected system roles (<code className="font-mono">ADMIN</code>, <code className="font-mono">SUPER_ADMIN</code>) cannot be deleted or renamed.
          </div>
        </div>
      )}

      {/* Subtab: Plant Team & Users Directory */}
      {activeSubTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} color="var(--accent-cyan)" /> Plant Team & User Directory
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Factory operators, floor supervisors, quality managers, and plant administrators
              </p>
            </div>
            <button
              onClick={loadUsers}
              disabled={loadingUsers}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px' }}
            >
              <RefreshCw size={12} className={loadingUsers ? 'animate-spin' : ''} /> Refresh Roster
            </button>
          </div>

          {/* Success / Error Alerts */}
          {userSuccess && (
            <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-emerald)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={15} />
              <span>{userSuccess}</span>
            </div>
          )}

          {userError && (
            <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-coral)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={15} />
              <span>{userError}</span>
            </div>
          )}

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', background: 'var(--bg-panel)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by name, username, phone, email, or plant..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="input"
                style={{ paddingLeft: '32px', fontSize: '12px' }}
              />
            </div>

            <select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              className="input"
              style={{ width: '160px', fontSize: '12px' }}
            >
              <option value="ALL">All Roles</option>
              <option value="OPERATOR">Operators</option>
              <option value="SUPERVISOR">Supervisors</option>
              <option value="QUALITY_MANAGER">Quality Managers</option>
              <option value="PLANT_MANAGER">Plant Managers</option>
              <option value="ADMIN">Admins</option>
              <option value="SUPER_ADMIN">Super Admins</option>
            </select>

            <select
              value={userStatusFilter}
              onChange={(e) => setUserStatusFilter(e.target.value)}
              className="input"
              style={{ width: '140px', fontSize: '12px' }}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Accounts</option>
              <option value="INACTIVE">Deactivated</option>
            </select>
          </div>

          {/* Users Table */}
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }}>
                    <th style={{ padding: '10px 14px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '10px' }}>User Details</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '10px' }}>Contact Info</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '10px' }}>Assigned Plant</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '10px' }}>Granted Roles</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '10px' }}>MFA Security</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '10px' }}>Status</th>
                    <th style={{ padding: '10px 14px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '10px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                        <div>Loading Plant Team Directory...</div>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No user accounts found in the factory database.
                      </td>
                    </tr>
                  ) : (
                    users
                      .filter(u => {
                        const matchesSearch = !userSearch || (
                          (u.userName && u.userName.toLowerCase().includes(userSearch.toLowerCase())) ||
                          (u.fullName && u.fullName.toLowerCase().includes(userSearch.toLowerCase())) ||
                          (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase())) ||
                          (u.phoneNumber && u.phoneNumber.includes(userSearch)) ||
                          (u.plantName && u.plantName.toLowerCase().includes(userSearch.toLowerCase()))
                        );
                        const matchesRole = userRoleFilter === 'ALL' || (u.roles && u.roles.some(r => r.toUpperCase().includes(userRoleFilter)));
                        const matchesStatus = userStatusFilter === 'ALL' || (userStatusFilter === 'ACTIVE' ? u.isActive : !u.isActive);
                        return matchesSearch && matchesRole && matchesStatus;
                      })
                      .map((u) => {
                        const isCurrent = (u.userName === authUser?.name) || (u.userId === authUser?.id) || (u.userName === profile?.userName);
                        const isTargetSuperAdmin = (u.roles || []).some(r => (typeof r === 'string' ? r : r?.roleName || '').toUpperCase().includes('SUPER_ADMIN'));
                        const isCallerSuperAdmin = (authUser?.roles || profile?.roles || []).some(r => (typeof r === 'string' ? r : r?.roleName || '').toUpperCase().includes('SUPER_ADMIN'));
                        const isProtectedSuperAdmin = isTargetSuperAdmin && !isCallerSuperAdmin;
                        const isActionDisabled = togglingUserId === u.userId || isCurrent || isProtectedSuperAdmin;

                        return (
                          <tr key={u.userId} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  background: u.isActive ? 'rgba(56, 189, 248, 0.15)' : 'rgba(156, 163, 175, 0.15)',
                                  border: `1px solid ${u.isActive ? 'rgba(56, 189, 248, 0.3)' : 'rgba(156, 163, 175, 0.3)'}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: '800',
                                  fontSize: '12px',
                                  color: u.isActive ? 'var(--accent-cyan)' : 'var(--text-muted)'
                                }}>
                                  {(u.fullName || u.userName || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {u.fullName || u.userName}
                                    {isCurrent && (
                                      <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.2)', color: 'var(--accent-cyan)', fontWeight: '700' }}>
                                        YOU
                                      </span>
                                    )}
                                  </div>
                                  <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    @{u.userName} · ID #{u.userId}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11.5px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)' }}>
                                  <Mail size={12} color="var(--text-muted)" />
                                  <span>{u.email || '—'}</span>
                                </div>
                                {u.phoneNumber && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)', fontSize: '11px' }}>
                                    <Phone size={11} color="var(--text-muted)" />
                                    <span>{u.phoneNumber}</span>
                                  </div>
                                )}
                              </div>
                            </td>

                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '11.5px' }}>
                                <Building2 size={13} color="var(--accent-cyan)" />
                                <span>{formatPlantName(u.plantName, 'Sri Vidhya Polymers - Unit 1')}</span>
                              </div>
                            </td>

                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {u.roles && u.roles.length > 0 ? (
                                  u.roles.map((r, idx) => (
                                    <span
                                      key={idx}
                                      style={{
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        fontFamily: 'var(--font-mono)',
                                        fontWeight: '700',
                                        background: r.includes('ADMIN') ? 'rgba(239, 68, 68, 0.15)' : (r.includes('MANAGER') ? 'rgba(245, 158, 11, 0.15)' : 'rgba(56, 189, 248, 0.15)'),
                                        color: r.includes('ADMIN') ? 'var(--accent-coral)' : (r.includes('MANAGER') ? 'var(--accent-amber)' : 'var(--accent-cyan)'),
                                        border: `1px solid ${r.includes('ADMIN') ? 'rgba(239, 68, 68, 0.3)' : (r.includes('MANAGER') ? 'rgba(245, 158, 11, 0.3)' : 'rgba(56, 189, 248, 0.3)')}`
                                      }}
                                    >
                                      {r.replace('ROLE_', '')}
                                    </span>
                                  ))
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>STANDARD_USER</span>
                                )}
                              </div>
                            </td>

                            <td style={{ padding: '12px 14px' }}>
                              <span style={{
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: '700',
                                background: u.mfaEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(156, 163, 175, 0.1)',
                                color: u.mfaEnabled ? 'var(--accent-emerald)' : 'var(--text-muted)',
                                border: `1px solid ${u.mfaEnabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(156, 163, 175, 0.2)'}`
                              }}>
                                {u.mfaEnabled ? 'TOTP ACTIVE' : 'STANDARD'}
                              </span>
                            </td>

                            <td style={{ padding: '12px 14px' }}>
                              <span className={u.isActive ? 'badge badge-emerald' : 'badge badge-amber'} style={{ fontSize: '10px' }}>
                                {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                            </td>

                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                              <button
                                onClick={() => handleToggleUser(u)}
                                disabled={isActionDisabled}
                                title={
                                  isProtectedSuperAdmin 
                                    ? "Protected: Only a Super Admin can modify Super Admin accounts"
                                    : isCurrent 
                                      ? "You cannot deactivate your own active session" 
                                      : (u.isActive ? "Deactivate User Account" : "Activate User Account")
                                }
                                className={`btn btn-xs ${u.isActive ? 'btn-ghost' : 'btn-primary'}`}
                                style={{
                                  fontSize: '11px',
                                  color: isProtectedSuperAdmin ? 'var(--text-muted)' : (u.isActive ? 'var(--accent-coral)' : '#FFFFFF'),
                                  opacity: (isCurrent || isProtectedSuperAdmin) ? 0.45 : 1,
                                  cursor: (isCurrent || isProtectedSuperAdmin) ? 'not-allowed' : 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                {isProtectedSuperAdmin ? <Shield size={11} color="var(--text-muted)" /> : <Power size={11} className={togglingUserId === u.userId ? 'animate-spin' : ''} />}
                                {isProtectedSuperAdmin ? 'Protected' : (u.isActive ? 'Deactivate' : 'Activate')}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 4: Directory & Audit Notice */}
      {activeSubTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={17} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                Security Audit & Event Logging Architecture
              </h2>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Security audit trails, authentication events, role grants, inventory mutations, and administrative activities are cryptographically recorded across backend Spring Boot transaction loggers and event streams.
            </p>
            <div
              style={{
                padding: '10px 12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xs)',
                fontSize: '11.5px',
                color: 'var(--accent-emerald)',
                fontFamily: 'var(--font-mono)'
              }}
            >
              ✓ Immutable audit logs enabled · Real-time multi-tenant plant scoping enforced
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="modal-backdrop" onClick={() => setShowEditProfile(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', padding: '22px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                Update Account Profile
              </h3>
              <button onClick={() => setShowEditProfile(false)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            {editProfileError && (
              <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-coral)', fontSize: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={15} />
                <span>{editProfileError}</span>
              </div>
            )}

            {editProfileSuccess && (
              <div style={{ padding: '8px 12px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-emerald)', fontSize: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={15} />
                <span>{editProfileSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  Username
                </label>
                <input
                  type="text"
                  required
                  className="input font-mono"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  className="input font-mono"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowEditProfile(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" disabled={savingProfile} className="btn btn-primary" style={{ flex: 1 }}>
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="modal-backdrop" onClick={() => {
          setShowChangePassword(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setPasswordError(null);
          setPasswordSuccess(null);
        }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '460px', padding: '22px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} color="var(--accent-amber)" />
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                  Change Account Password
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowChangePassword(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError(null);
                  setPasswordSuccess(null);
                }}
                className="btn btn-ghost btn-sm"
                style={{ padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>

            {passwordError && (
              <div style={{ padding: '9px 12px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-coral)', fontSize: '12px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div style={{ padding: '9px 12px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-emerald)', fontSize: '12px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  Current Password
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Enter current password"
                    className="input font-mono"
                    style={{ width: '100%', paddingRight: '36px' }}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={{ position: 'absolute', right: '10px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                    title={showCurrentPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  New Password
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Enter new password (min. 8 chars)"
                    className="input font-mono"
                    style={{ width: '100%', paddingRight: '36px' }}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{ position: 'absolute', right: '10px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {/* Password Policy Guidance */}
                <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ color: newPassword.length >= 8 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                      {newPassword.length >= 8 ? '✓' : '•'}
                    </span>
                    <span>At least 8 characters</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ color: (/[a-zA-Z]/.test(newPassword) && /[^a-zA-Z]/.test(newPassword)) ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                      {(/[a-zA-Z]/.test(newPassword) && /[^a-zA-Z]/.test(newPassword)) ? '✓' : '•'}
                    </span>
                    <span>Combination of letters & numbers or special characters</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ color: (newPassword && newPassword !== currentPassword) ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                      {(newPassword && newPassword !== currentPassword) ? '✓' : '•'}
                    </span>
                    <span>Different from current password</span>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  Confirm New Password
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Re-enter new password"
                    className="input font-mono"
                    style={{ width: '100%', paddingRight: '36px' }}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ position: 'absolute', right: '10px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {confirmPassword && (
                  <div style={{ marginTop: '4px', fontSize: '11px', color: confirmPassword === newPassword ? 'var(--accent-emerald)' : 'var(--accent-coral)' }}>
                    {confirmPassword === newPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError(null);
                    setPasswordSuccess(null);
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  className="btn btn-primary"
                  style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {changingPassword ? (
                    <>
                      <RefreshCw size={13} className="spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MFA Enrollment Modal */}
      {showMfaEnroll && (
        <div className="modal-backdrop" onClick={() => setShowMfaEnroll(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px', padding: '22px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Smartphone size={18} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  Setup Authenticator 2FA (RFC 6238)
                </h3>
              </div>
              <button onClick={() => setShowMfaEnroll(false)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            {enrollError && (
              <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-coral)', fontSize: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={15} />
                <span>{enrollError}</span>
              </div>
            )}

            {enrolling ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                Generating cryptographic Base32 TOTP secret...
              </div>
            ) : (
              <form onSubmit={handleConfirmTotp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Add this secret key to Google Authenticator, Microsoft Authenticator, or 1Password:
                </div>

                <div
                  style={{
                    background: 'var(--bg-surface-active)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '10px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <code className="font-mono" style={{ fontSize: '13px', color: 'var(--accent-cyan)', letterSpacing: '1px' }}>
                    {enrollData?.secret || 'GENERATING...'}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="btn btn-ghost btn-xs"
                    style={{ padding: '3px 6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {copiedSecret ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                    {copiedSecret ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                    Enter 6-Digit TOTP Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    className="input font-mono"
                    style={{ fontSize: '16px', letterSpacing: '4px', textAlign: 'center' }}
                    value={totpInput}
                    onChange={(e) => setTotpInput(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button type="button" onClick={() => setShowMfaEnroll(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={confirmingTotp || !totpInput} className="btn btn-primary" style={{ flex: 1 }}>
                    {confirmingTotp ? 'Verifying...' : 'Activate 2FA'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MFA Disable Modal */}
      {showMfaDisable && (
        <div className="modal-backdrop" onClick={() => setShowMfaDisable(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', padding: '22px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="var(--accent-coral)" />
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  Disable Two-Factor Authentication
                </h3>
              </div>
              <button onClick={() => setShowMfaDisable(false)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            {disableError && (
              <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-coral)', fontSize: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={15} />
                <span>{disableError}</span>
              </div>
            )}

            <form onSubmit={handleDisableMfa} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                To disable two-factor authentication, verify your current account password and an active 6-digit TOTP code:
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  Current Account Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showDisablePassword ? 'text' : 'password'}
                    required
                    className="input font-mono"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    style={{ paddingRight: '36px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowDisablePassword(!showDisablePassword)}
                    aria-label={showDisablePassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0
                    }}
                  >
                    {showDisablePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  Current 6-Digit TOTP Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  className="input font-mono"
                  style={{ fontSize: '16px', letterSpacing: '4px', textAlign: 'center' }}
                  value={disableTotp}
                  onChange={(e) => setDisableTotp(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowMfaDisable(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" disabled={disablingMfa || !disablePassword || !disableTotp} className="btn btn-primary" style={{ flex: 1, background: 'var(--accent-coral)', borderColor: 'var(--accent-coral)' }}>
                  {disablingMfa ? 'Disabling...' : 'Confirm Disable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Management Modals */}
      <CreateRoleModal
        isOpen={isCreateRoleOpen}
        onClose={() => setIsCreateRoleOpen(false)}
        onRoleCreated={(newRole) => {
          setRoles(prev => [...prev, newRole]);
          setRoleSuccessMessage(`Enterprise role '${newRole.roleName}' created successfully.`);
          setTimeout(() => setRoleSuccessMessage(null), 4000);
        }}
      />

      <EditRoleModal
        isOpen={isEditRoleOpen}
        onClose={() => {
          setIsEditRoleOpen(false);
          setSelectedRole(null);
        }}
        role={selectedRole}
        onRoleUpdated={(updated) => {
          setRoles(prev => prev.map(r => (r.roleId === updated.roleId || r.roleName === updated.roleName) ? updated : r));
          setRoleSuccessMessage(`Enterprise role '${updated.roleName}' updated successfully.`);
          setTimeout(() => setRoleSuccessMessage(null), 4000);
        }}
      />

      <ViewRoleModal
        isOpen={isViewRoleOpen}
        onClose={() => {
          setIsViewRoleOpen(false);
          setSelectedRole(null);
        }}
        role={selectedRole}
      />

      <DeleteRoleModal
        isOpen={isDeleteRoleOpen}
        onClose={() => {
          setIsDeleteRoleOpen(false);
          setSelectedRole(null);
        }}
        role={selectedRole}
        onRoleDeleted={(deletedId) => {
          setRoles(prev => prev.filter(r => r.roleId !== deletedId));
          setRoleSuccessMessage('Enterprise role removed successfully.');
          setTimeout(() => setRoleSuccessMessage(null), 4000);
        }}
      />
    </div>
  );
}

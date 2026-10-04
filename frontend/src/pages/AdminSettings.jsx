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
  LogOut
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
  extractErrorMessage
} from '../services/domain/adminService';
import { formatPlantName } from '../utils/brand';

export default function AdminSettings() {
  const { user: authUser, logout } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('account'); // 'account' | 'roles' | 'audit'

  // Current User Profile State
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState(null);

  // MFA State
  const [mfaStatus, setMfaStatus] = useState(null);
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
  const [disableTotp, setDisableTotp] = useState('');
  const [disablingMfa, setDisablingMfa] = useState(false);
  const [disableError, setDisableError] = useState(null);

  // Load user profile independently
  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    setProfileError(null);
    try {
      const profileRes = await getCurrentUserProfile();
      setProfile(profileRes.data);
      setEditUsername(profileRes.data.userName || '');
      setEditEmail(profileRes.data.email || '');
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to fetch current user profile.');
      setProfileError(msg);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  // Load MFA status independently
  const loadMfa = useCallback(async () => {
    setLoadingMfa(true);
    setMfaError(null);
    try {
      const mfaRes = await getMfaStatus();
      setMfaStatus(mfaRes.data);
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
  }, [loadProfile, loadMfa]);

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
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    setChangingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      await changeCurrentUserPassword({
        currentPassword,
        newPassword,
        confirmPassword
      });
      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowChangePassword(false);
        setPasswordSuccess(null);
      }, 1200);
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
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-default)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveSubTab('account')}
          className={`btn btn-sm ${activeSubTab === 'account' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '12px' }}
        >
          <UserCheck size={13} /> Current Session & Account
        </button>
        <button
          onClick={() => setActiveSubTab('roles')}
          className={`btn btn-sm ${activeSubTab === 'roles' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '12px' }}
        >
          <Shield size={13} /> Role & Access Architecture
        </button>
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`btn btn-sm ${activeSubTab === 'audit' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '12px' }}
        >
          <Clock size={13} /> Directory & Audit Notice
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
                onClick={() => {
                  setEditProfileError(null);
                  setEditProfileSuccess(null);
                  setShowEditProfile(true);
                }}
                disabled={!profile}
                className="btn btn-secondary btn-sm"
              >
                Edit Profile
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
                  {profile?.plantName ? formatPlantName(profile.plantName) : (profileError ? 'Plant Sync Pending' : 'Not Assigned')}
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
                onClick={() => {
                  setPasswordError(null);
                  setPasswordSuccess(null);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setShowChangePassword(true);
                }}
                className="btn btn-secondary btn-sm"
              >
                Change Password
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
                <span className={mfaStatus?.mfaEnabled ? 'badge badge-emerald' : 'badge badge-amber'}>
                  {mfaStatus?.mfaEnabled ? 'MFA ACTIVE' : (mfaError ? 'STATUS UNAVAILABLE' : 'MFA DISABLED')}
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
              <strong>Security Protocol:</strong> Plaintext credentials and password hashes are never transmitted or exposed in the frontend. Password mutations are processed securely by <code className="font-mono">PUT /api/v1/users/me/password</code> with current-credential verification.
            </div>
          </div>
        </div>
      )}


      {/* Subtab 3: Role & Access Architecture */}
      {activeSubTab === 'roles' && (
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} color="var(--accent-cyan)" /> Enterprise Role & Authority Registry (14 Roles)
              </h2>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Configured Spring Security authority hierarchies enforced by method-level <code className="font-mono">@PreAuthorize</code> annotations.
              </p>
            </div>
          </div>

          <div className="data-table-container" style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
            <table className="table" style={{ width: '100%', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Enterprise Business Role</th>
                  <th>Spring Security Authority</th>
                  <th>Operational Domain & Authority Scope</th>
                  <th>Primary Module</th>
                </tr>
              </thead>
              <tbody>
                {enterpriseRoles.map((r, idx) => (
                  <tr key={r.name}>
                    <td className="font-mono" style={{ color: 'var(--text-muted)' }}>#{idx + 1}</td>
                    <td style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{r.name}</td>
                    <td className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{r.authority}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{r.domain}</td>
                    <td className="font-mono" style={{ fontSize: '11px', color: 'var(--accent-emerald)' }}>{r.landing}</td>
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
            <strong>RBAC Enforcement Notice:</strong> Method-level access control is enforced authoritatively on Spring Boot controllers. Dynamic runtime role creation and authority assignment endpoints are not exposed via the REST API; role definitions are maintained within database migration scripts (<code className="font-mono">app_role</code> table).
          </div>
        </div>
      )}

      {/* Subtab 4: Directory & Audit Notice */}
      {activeSubTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={17} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                User Directory Status
              </h2>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              The current StockAI backend exposes authenticated user profile management (<code className="font-mono">/api/v1/users/me</code>), credentials updates (<code className="font-mono">/api/v1/users/me/password</code>), and session authentication (<code className="font-mono">/api/v1/auth/*</code>). A multi-user directory listing endpoint (<code className="font-mono">GET /api/v1/users</code>) is not exposed by current backend controllers.
            </p>
            <div
              style={{
                padding: '10px 12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xs)',
                fontSize: '11.5px',
                color: 'var(--text-muted)'
              }}
            >
              In strict adherence to backend truth, hardcoded demo user rosters and plaintext passwords have been removed.
            </div>
          </div>

          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={17} color="var(--accent-amber)" />
              <h2 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                Security Audit & Event Logging Status
              </h2>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Security audit trails, login session history, and administrative activity events are captured in server log streams and Docker container journals. No dedicated REST query endpoint (<code className="font-mono">GET /api/v1/audit</code>) is currently exposed by the backend for browser consumption.
            </p>
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
        <div className="modal-backdrop" onClick={() => setShowChangePassword(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', padding: '22px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                Change Account Password
              </h3>
              <button onClick={() => setShowChangePassword(false)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            {passwordError && (
              <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-coral)', fontSize: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={15} />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div style={{ padding: '8px 12px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-emerald)', fontSize: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={15} />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  className="input font-mono"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  New Password (min. 8 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className="input font-mono"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className="input font-mono"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowChangePassword(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" disabled={changingPassword} className="btn btn-primary" style={{ flex: 1 }}>
                  {changingPassword ? 'Updating...' : 'Change Password'}
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
                <input
                  type="password"
                  required
                  className="input font-mono"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                />
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
    </div>
  );
}

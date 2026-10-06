import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  ShieldCheck, 
  Building, 
  Check, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Save, 
  KeyRound,
  BadgeCheck,
  Calendar
} from 'lucide-react';
import { 
  getCurrentUserProfile, 
  updateCurrentUserProfile, 
  changeCurrentUserPassword,
  extractErrorMessage 
} from '../services/domain/adminService';

export default function UserProfileModal({ isOpen, onClose, onProfileUpdated }) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'password'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Profile fields
  const [profileData, setProfileData] = useState({
    userId: null,
    userName: '',
    fullName: '',
    email: '',
    phoneNumber: '',
    plantName: '',
    roles: [],
    mfaEnabled: false,
    isActive: true,
    createdAt: null
  });

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCurrentUserProfile();
      if (res?.data) {
        setProfileData({
          userId: res.data.userId,
          userName: res.data.userName || '',
          fullName: res.data.fullName || '',
          email: res.data.email || '',
          phoneNumber: res.data.phoneNumber || '',
          plantName: res.data.plantName || 'Sri Vidha Polymers - Unit 1',
          roles: res.data.roles || [],
          mfaEnabled: Boolean(res.data.mfaEnabled),
          isActive: res.data.isActive !== false,
          createdAt: res.data.createdAt
        });
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError(extractErrorMessage(err, 'Failed to fetch user profile data.'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profileData.userName.trim()) {
      setError('Username cannot be empty.');
      return;
    }
    if (!profileData.email.trim()) {
      setError('Email address cannot be empty.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await updateCurrentUserProfile({
        userName: profileData.userName.trim(),
        fullName: profileData.fullName?.trim() || null,
        email: profileData.email.trim(),
        phoneNumber: profileData.phoneNumber?.trim() || null
      });

      setSuccessMsg('Profile details successfully updated!');
      if (res?.data) {
        setProfileData(prev => ({
          ...prev,
          userName: res.data.userName,
          fullName: res.data.fullName,
          email: res.data.email,
          phoneNumber: res.data.phoneNumber
        }));
        if (onProfileUpdated) {
          onProfileUpdated(res.data);
        }
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(extractErrorMessage(err, 'Failed to update profile information.'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation password do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password cannot be the same as the current password.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await changeCurrentUserPassword({
        currentPassword,
        newPassword,
        confirmPassword
      });

      setSuccessMsg('Password changed successfully! Keep your new credentials safe.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Failed to change password:', err);
      setError(extractErrorMessage(err, 'Failed to update account password.'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto'
      }}
    >
      <div 
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid var(--border-default)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#F8FAFC'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#E0F2FE',
              color: '#0284C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '15px',
              fontFamily: 'var(--font-mono)'
            }}>
              {(profileData.fullName || profileData.userName || 'U').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Account & Profile Settings
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Manage your credentials, contact info, and security preferences
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-icon"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0 24px',
          background: '#FFFFFF'
        }}>
          <button
            onClick={() => { setActiveTab('profile'); setError(null); setSuccessMsg(null); }}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'profile' ? '2px solid #0284C7' : '2px solid transparent',
              color: activeTab === 'profile' ? '#0284C7' : 'var(--text-secondary)',
              fontWeight: activeTab === 'profile' ? '700' : '500',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <User size={15} />
            <span>Profile Details</span>
          </button>

          <button
            onClick={() => { setActiveTab('password'); setError(null); setSuccessMsg(null); }}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'password' ? '2px solid #0284C7' : '2px solid transparent',
              color: activeTab === 'password' ? '#0284C7' : 'var(--text-secondary)',
              fontWeight: activeTab === 'password' ? '700' : '500',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Lock size={15} />
            <span>Change Password</span>
          </button>
        </div>

        {/* Modal Body with Scroll */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* Alerts */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              color: '#B91C1C',
              fontSize: '12.5px',
              marginBottom: '16px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              background: '#ECFDF5',
              border: '1px solid #6EE7B7',
              borderRadius: '8px',
              color: '#047857',
              fontSize: '12.5px',
              marginBottom: '16px'
            }}>
              <Check size={16} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Account Badge Overview */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Role</div>
              <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0284C7', marginTop: '2px' }}>
                {profileData.roles.join(', ') || 'Standard User'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Plant / Location</div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px' }}>
                {profileData.plantName}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Account Status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981' }} />
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#047857' }}>Active</span>
              </div>
            </div>
          </div>

          {/* TAB 1: Profile Details Form */}
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={profileData.fullName}
                    onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                    placeholder="e.g. John Doe"
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 36px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <User size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Username <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      required
                      value={profileData.userName}
                      onChange={(e) => setProfileData({ ...profileData, userName: e.target.value })}
                      placeholder="Username"
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 36px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'var(--font-mono)'
                      }}
                    />
                    <BadgeCheck size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Phone Number
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="tel"
                      value={profileData.phoneNumber}
                      onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                      placeholder="+91 98765 43210"
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 36px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <Phone size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Email Address <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    required
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    placeholder="user@stockai.com"
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 36px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <Mail size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary"
                  style={{ fontSize: '13px', padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="btn btn-primary"
                  style={{
                    fontSize: '13px',
                    padding: '8px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#0284C7',
                    borderColor: '#0284C7'
                  }}
                >
                  <Save size={14} />
                  <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Change Password Form */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Current Password <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    style={{
                      width: '100%',
                      padding: '8px 40px 8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '8px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)'
                    }}
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  New Password <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    style={{
                      width: '100%',
                      padding: '8px 40px 8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '8px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)'
                    }}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Confirm New Password <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    style={{
                      width: '100%',
                      padding: '8px 40px 8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '8px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)'
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary"
                  style={{ fontSize: '13px', padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="btn btn-primary"
                  style={{
                    fontSize: '13px',
                    padding: '8px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#0284C7',
                    borderColor: '#0284C7'
                  }}
                >
                  <KeyRound size={14} />
                  <span>{saving ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

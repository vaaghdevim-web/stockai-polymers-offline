import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, User, AlertTriangle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import TotpVerificationModal from '../components/TotpVerificationModal';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showTotpModal, setShowTotpModal] = useState(false);
  const [error, setError] = useState('');
  const [totpError, setTotpError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setTotpError('');
    setLoading(true);

    try {
      const result = await login(username, password, null);
      if (result?.totpRequired) {
        setShowTotpModal(true);
      }
    } catch (err) {
      const msg = err.message || 'Authentication failed';
      if (msg.toLowerCase().includes('totp') || msg.toLowerCase().includes('mfa')) {
        setShowTotpModal(true);
        setTotpError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTotpVerify = async (code) => {
    setTotpError('');
    try {
      await login(username, password, code);
      setShowTotpModal(false);
    } catch (err) {
      const msg = err.message || 'Invalid 2FA TOTP code. Please retry with a valid dynamic authenticator code.';
      setTotpError(msg);
      throw err;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'radial-gradient(circle at 50% 20%, #131B26 0%, #080B0F 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflowY: 'auto'
    }}>
      {/* Background Grid Accent */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        pointerEvents: 'none'
      }} />

      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        padding: '32px 28px',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Brand Banner */}
        <div style={{
          marginBottom: '24px',
          background: '#FFFFFF',
          borderRadius: '10px',
          padding: '10px 14px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <img 
            src="/stockai-full-logo.jpg" 
            alt="StockAI OS — Sri Vidhya Polymers" 
            style={{
              maxWidth: '100%',
              height: '48px',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>

        {/* Security Alert / Info */}
        <div style={{
          padding: '8px 12px',
          background: 'rgba(0, 210, 255, 0.08)',
          border: '1px solid rgba(0, 210, 255, 0.25)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '11.5px',
          color: 'var(--text-secondary)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Shield size={16} color="var(--accent-cyan)" />
          <span>Industrial Operating Terminal · RFC 6238 2FA</span>
        </div>

        {error && !showTotpModal && (
          <div style={{
            padding: '10px 12px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-coral)',
            fontSize: '12px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleInitialSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
              Operator ID / Email
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                required
                className="input"
                placeholder="admin or operator"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: '32px' }}
              />
              <User size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
              Terminal Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '32px', paddingRight: '36px' }}
              />
              <Lock size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: '10px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-muted)' }}>
            <strong>Two-Factor Policy:</strong>
            <div style={{ marginTop: '2px' }}>Accounts with active MFA will be prompted for their 6-digit Google Authenticator TOTP token upon password verification.</div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px', marginTop: '6px', fontSize: '13px' }}
          >
            {loading ? 'Authenticating Terminal...' : 'Sign In to Terminal'}
            <ArrowRight size={15} />
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
          Authorized Sri Vidhya Polymers Personnel Only
        </div>
      </div>

      <TotpVerificationModal
        isOpen={showTotpModal}
        onClose={() => setShowTotpModal(false)}
        onVerify={handleTotpVerify}
        username={username}
        error={totpError}
      />
    </div>
  );
}

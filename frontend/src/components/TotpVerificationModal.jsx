import React, { useState } from 'react';
import { AlertCircle, KeyRound } from 'lucide-react';

export default function TotpVerificationModal({ isOpen, onClose, onVerify, username, error }) {
  const [totpCode, setTotpCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (totpCode.trim().length !== 6) return;
    setVerifying(true);
    try {
      await onVerify(totpCode.trim());
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '420px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(0, 210, 255, 0.12)',
            border: '1px solid rgba(0, 210, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-cyan)'
          }}>
            <KeyRound size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Two-Factor Authentication
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              RFC 6238 TOTP Security Challenge
            </p>
          </div>
        </div>

        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
          Two-Factor Authentication is active for <strong style={{ color: 'var(--text-primary)' }}>{username || 'account'}</strong>. Enter the 6-digit dynamic passcode from your Authenticator app:
        </p>

        {error && (
          <div style={{
            padding: '8px 12px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-coral)',
            fontSize: '12px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
              6-Digit Authenticator Code
            </label>
            <input
              type="text"
              autoFocus
              maxLength={6}
              placeholder="000000"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px',
                fontSize: '22px',
                letterSpacing: '0.3em',
                textAlign: 'center',
                color: 'var(--accent-cyan)',
                fontFamily: 'var(--font-mono)',
                width: '100%',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={totpCode.length !== 6 || verifying}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              {verifying ? 'Verifying...' : 'Authenticate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { X, ShieldCheck, KeyRound, QrCode, Copy, Check } from 'lucide-react';

export default function MfaSetupModal({ isOpen, onClose, user }) {
  const [copied, setCopied] = useState(false);
  const secretKey = 'SVPSTOCKAIADMIN2FASECRETKEY2026';

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(secretKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} color="var(--accent-emerald)" />
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Google Authenticator 2FA Security
            </h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '16px' }}>
          Two-Factor Authentication is active for <strong style={{ color: 'var(--text-primary)' }}>{user?.email || 'admin@srividhyapolymers.com'}</strong>. Scan with Google Authenticator or enter the secret key manually:
        </p>

        {/* QR Code Simulation Area */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-sm)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div style={{
            width: '140px',
            height: '140px',
            background: '#FFFFFF',
            borderRadius: 'var(--radius-xs)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000000'
          }}>
            <QrCode size={120} />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Issuer: <strong style={{ color: 'var(--text-primary)' }}>Sri Vidhya Polymers (StockAI)</strong>
          </div>
        </div>

        {/* Secret Key Text */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
            Manual Entry Secret Key
          </label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 10px',
            justifyContent: 'space-between'
          }}>
            <span className="font-mono" style={{ fontSize: '12px', color: 'var(--accent-cyan)', letterSpacing: '0.08em' }}>
              {secretKey}
            </span>
            <button
              onClick={handleCopy}
              className="btn btn-ghost btn-sm"
              style={{ padding: '3px 8px', fontSize: '11px' }}
            >
              {copied ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <button onClick={onClose} className="btn btn-primary" style={{ width: '100%' }}>
          Done & Close Security Setup
        </button>
      </div>
    </div>
  );
}

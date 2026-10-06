import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export default function QrCodeVisual({
  value = 'SVP-STOCKAI-2026',
  size = 140,
  darkColor = '#0F172A',
  lightColor = '#FFFFFF',
  className = '',
  style = {}
}) {
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (!value) {
      setSvgContent('');
      return;
    }

    QRCode.toString(value, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      color: {
        dark: darkColor,
        light: lightColor
      }
    })
      .then((svgString) => {
        if (isMounted) {
          setSvgContent(svgString);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('QR Code generation error:', err);
          setError('Failed to generate QR');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [value, darkColor, lightColor]);

  if (error) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'monospace', ...style }}>
        [Invalid QR Code]
      </div>
    );
  }

  return (
    <div
      className={`qr-code-wrapper ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        background: lightColor,
        padding: '4px',
        borderRadius: '6px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        ...style
      }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}

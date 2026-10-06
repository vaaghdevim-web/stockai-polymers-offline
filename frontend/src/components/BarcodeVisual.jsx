import React, { useMemo } from 'react';

/**
 * Standard Code-128B Barcode SVG Renderer
 */

const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112' // 100-106 (106 is STOP pattern: 13 modules)
];

const START_CODE_B = 104;
const STOP_CODE = 106;

function encodeCode128(text) {
  if (!text) return null;
  const clean = text.toString().toUpperCase().replace(/[^ -~]/g, '');
  if (clean.length === 0) return null;

  const codes = [START_CODE_B];
  let checksum = START_CODE_B;

  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i) - 32;
    if (charCode >= 0 && charCode <= 95) {
      codes.push(charCode);
      checksum += charCode * (i + 1);
    }
  }

  const checkDigit = checksum % 103;
  codes.push(checkDigit);
  codes.push(STOP_CODE);

  let modules = '';
  for (let i = 0; i < codes.length; i++) {
    const codeIndex = codes[i];
    const pattern = CODE128_PATTERNS[codeIndex] || '111111';
    for (let p = 0; p < pattern.length; p++) {
      const w = parseInt(pattern[p], 10);
      const isBar = p % 2 === 0;
      modules += (isBar ? '1' : '0').repeat(w);
    }
  }

  return {
    modules,
    totalWidth: modules.length,
    displayText: clean
  };
}

export default function BarcodeVisual({
  value = 'SVP-STOCKAI-2026',
  width = 220,
  height = 48,
  showText = true,
  barColor = '#0F172A',
  background = 'transparent',
  className = '',
  style = {}
}) {
  const encoded = useMemo(() => encodeCode128(value), [value]);

  if (!encoded) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'monospace', ...style }}>
        [Invalid Barcode Value]
      </div>
    );
  }

  const { modules, totalWidth, displayText } = encoded;
  const quietZone = 10;
  const svgWidth = totalWidth + quietZone * 2;

  // Build SVG rects
  const rects = [];
  let currentStart = null;

  for (let i = 0; i < modules.length; i++) {
    if (modules[i] === '1') {
      if (currentStart === null) currentStart = i;
    } else {
      if (currentStart !== null) {
        rects.push(
          <rect
            key={currentStart}
            x={currentStart + quietZone}
            y={0}
            width={i - currentStart}
            height={height}
            fill={barColor}
            shapeRendering="crispEdges"
          />
        );
        currentStart = null;
      }
    }
  }

  if (currentStart !== null) {
    rects.push(
      <rect
        key={currentStart}
        x={currentStart + quietZone}
        y={0}
        width={modules.length - currentStart}
        height={height}
        fill={barColor}
        shapeRendering="crispEdges"
      />
    );
  }

  // Handle width prop safely
  let finalWidthStyle = '100%';
  let maxW = '280px';
  if (typeof width === 'number') {
    if (width <= 10) {
      // Treated as scale multiplier
      finalWidthStyle = `${svgWidth * width}px`;
      maxW = `${svgWidth * width}px`;
    } else {
      finalWidthStyle = `${width}px`;
      maxW = `${width}px`;
    }
  } else if (typeof width === 'string') {
    finalWidthStyle = width;
  }

  return (
    <div
      className={`barcode-visual-wrapper ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background,
        padding: '6px 10px',
        borderRadius: '6px',
        userSelect: 'none',
        width: 'auto',
        maxWidth: '100%',
        ...style
      }}
    >
      <svg
        viewBox={`0 0 ${svgWidth} ${height}`}
        style={{
          width: finalWidthStyle,
          maxWidth: maxW,
          height: `${height}px`,
          display: 'block'
        }}
        preserveAspectRatio="none"
      >
        {rects}
      </svg>
      {showText && (
        <span
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '1.5px',
            marginTop: '4px',
            color: barColor,
            whiteSpace: 'nowrap'
          }}
        >
          {displayText}
        </span>
      )}
    </div>
  );
}

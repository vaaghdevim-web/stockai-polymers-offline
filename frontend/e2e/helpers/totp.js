import crypto from 'crypto';

function base32ToBuffer(str) {
  const clean = str.toUpperCase().replace(/[\s=-]/g, '');
  if (!/^[A-Z2-7]+$/.test(clean)) {
    return Buffer.from(str);
  }
  const numBytes = Math.floor(clean.length * 5 / 8);
  const bytes = Buffer.alloc(numBytes);
  let buffer = 0, bitsLeft = 0, index = 0;
  for (const c of clean) {
    const val = c >= 'A' && c <= 'Z' ? c.charCodeAt(0) - 65 : c.charCodeAt(0) - 50 + 26;
    buffer = (buffer << 5) | val;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      if (index < numBytes) {
        bytes[index++] = (buffer >> (bitsLeft - 8)) & 0xff;
      }
      bitsLeft -= 8;
    }
  }
  return bytes;
}

/**
 * RFC 6238 Time-Based One-Time Password (TOTP) Generator for E2E testing.
 * Strictly computes HMAC-SHA1 across 30-second time steps matching backend MfaService.java.
 *
 * @param {string} secret Base32 or plain string secret configured on user
 * @param {number} timeOffsetSteps Number of 30-second steps to offset (default 0)
 * @returns {string} 6-digit TOTP string
 */
export function generateTotp(secret, timeOffsetSteps = 0) {
  const timeStep = Math.floor(Date.now() / 1000 / 30) + timeOffsetSteps;
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(timeStep), 0);

  const keyBytes = base32ToBuffer(secret);
  const hmac = crypto.createHmac('sha1', keyBytes);
  hmac.update(buffer);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1] & 0x0f;
  const binary = ((hash[offset] & 0x7f) << 24) |
                 ((hash[offset + 1] & 0xff) << 16) |
                 ((hash[offset + 2] & 0xff) << 8) |
                 (hash[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return String(otp).padStart(6, '0');
}

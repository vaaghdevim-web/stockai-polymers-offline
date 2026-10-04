import crypto from 'crypto';

/**
 * RFC 6238 Time-Based One-Time Password (TOTP) Generator for E2E testing.
 * Strictly computes HMAC-SHA1 across 30-second time steps matching backend MfaService.java.
 *
 * @param {string} secret Base32 or plain string secret configured on user
 * @param {number} timeOffsetSteps Number of 30-second steps to offset (default 0)
 * @returns {string} 6-digit TOTP string
 */
export function generateTotp(secret, timeOffsetSteps = 0) {
  if (!secret) {
    throw new Error('E2E_ADMIN_MFA_SECRET is not configured. Set the environment variable before running Playwright tests.');
  }
  const timeStep = Math.floor(Date.now() / 1000 / 30) + timeOffsetSteps;
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(timeStep), 0);

  const hmac = crypto.createHmac('sha1', Buffer.from(secret));
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

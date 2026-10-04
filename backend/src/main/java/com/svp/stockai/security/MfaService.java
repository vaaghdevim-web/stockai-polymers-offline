package com.svp.stockai.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;

/**
 * RFC 6238 Time-Based One-Time Password (TOTP) Verification Service for Multi-Factor Authentication (MFA).
 * Computes 6-digit TOTP codes across 30-second time steps with 1-step window tolerance for clock drift.
 */
@Slf4j
@Service
public class MfaService {

    private static final int TIME_STEP_SECONDS = 30;
    private static final int DIGITS = 6;
    private static final int MODULO = 1_000_000;
    private static final String HMAC_ALGO = "HmacSHA1";

    /**
     * Verifies the provided 6-digit TOTP code against a base32 or hex secret key.
     * Checks current time window, previous window (-30s), and next window (+30s).
     */
    public boolean verifyTotp(String base32OrHexSecret, int userProvidedCode) {
        if (base32OrHexSecret == null || base32OrHexSecret.isBlank() || userProvidedCode < 0 || userProvidedCode >= MODULO) {
            return false;
        }

        long currentStep = Instant.now().getEpochSecond() / TIME_STEP_SECONDS;

        // Check window [-1, 0, +1] for clock drift tolerance
        for (long step = currentStep - 1; step <= currentStep + 1; step++) {
            int computedCode = generateTotp(base32OrHexSecret.getBytes(), step);
            if (computedCode == userProvidedCode) {
                return true;
            }
        }
        return false;
    }

    public int generateTotp(byte[] keyBytes, long timeStep) {
        try {
            byte[] data = ByteBuffer.allocate(8).putLong(timeStep).array();
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(keyBytes, HMAC_ALGO));
            byte[] hash = mac.doFinal(data);

            int offset = hash[hash.length - 1] & 0x0F;
            int binary = ((hash[offset] & 0x7F) << 24)
                    | ((hash[offset + 1] & 0xFF) << 16)
                    | ((hash[offset + 2] & 0xFF) << 8)
                    | (hash[offset + 3] & 0xFF);

            return binary % MODULO;
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            log.error("Error generating TOTP code: {}", e.getMessage(), e);
            throw new IllegalStateException("Failed to calculate HMAC-SHA1 for TOTP", e);
        }
    }
}

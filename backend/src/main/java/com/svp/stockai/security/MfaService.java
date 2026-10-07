package com.svp.stockai.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;

@Slf4j
@Service
public class MfaService {

    private static final int SECRET_BYTES = 20;       // 160-bit RFC-compatible secret
    private static final int TIME_STEP_SECONDS = 30;
    private static final int DIGITS = 6;
    private static final int MODULO = 1_000_000;
    private static final int CLOCK_SKEW_STEPS = 1;
    private static final String HMAC_ALGO = "HmacSHA1";
    private static final String BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Generates a cryptographically random 160-bit Base32 TOTP secret.
     */
    public String generateSecret() {
        byte[] secret = new byte[SECRET_BYTES];
        secureRandom.nextBytes(secret);
        return encodeBase32(secret);
    }

    /**
     * Builds a standard otpauth:// URI understood by Google Authenticator,
     * Microsoft Authenticator and compatible TOTP applications.
     */
    public String buildProvisioningUri(String issuer, String accountName, String secret) {
        if (issuer == null || issuer.isBlank()) {
            throw new IllegalArgumentException("Issuer is required");
        }
        if (accountName == null || accountName.isBlank()) {
            throw new IllegalArgumentException("Account name is required");
        }
        if (secret == null || secret.isBlank()) {
            throw new IllegalArgumentException("Secret is required");
        }

        String encodedIssuer = urlEncode(issuer);
        String encodedAccount = urlEncode(accountName);

        return "otpauth://totp/"
                + encodedIssuer + ":" + encodedAccount
                + "?secret=" + secret
                + "&issuer=" + encodedIssuer
                + "&algorithm=SHA1"
                + "&digits=" + DIGITS
                + "&period=" + TIME_STEP_SECONDS;
    }

    /**
     * Verifies a 6-digit RFC 6238 TOTP code.
     * Only valid Base32 secrets are accepted.
     */
    public boolean verifyTotp(String base32Secret, int userProvidedCode) {
        if (base32Secret == null
                || base32Secret.isBlank()
                || userProvidedCode < 0
                || userProvidedCode >= MODULO) {
            return false;
        }

        byte[] secretBytes = decodeBase32(base32Secret);
        if (secretBytes == null || secretBytes.length == 0) {
            return false;
        }

        long currentStep = Instant.now().getEpochSecond() / TIME_STEP_SECONDS;

        for (long step = currentStep - CLOCK_SKEW_STEPS;
             step <= currentStep + CLOCK_SKEW_STEPS;
             step++) {

            if (generateTotp(secretBytes, step) == userProvidedCode) {
                return true;
            }
        }

        return false;
    }

    public int generateTotp(byte[] keyBytes, long timeStep) {
        try {
            byte[] data = ByteBuffer.allocate(8)
                    .putLong(timeStep)
                    .array();

            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(keyBytes, HMAC_ALGO));

            byte[] hash = mac.doFinal(data);

            int offset = hash[hash.length - 1] & 0x0F;

            int binary = ((hash[offset] & 0x7F) << 24)
                    | ((hash[offset + 1] & 0xFF) << 16)
                    | ((hash[offset + 2] & 0xFF) << 8)
                    | (hash[offset + 3] & 0xFF);

            return binary % MODULO;

        } catch (Exception e) {
            log.error("Failed to generate TOTP code", e);
            throw new IllegalStateException("Failed to calculate TOTP code", e);
        }
    }

    public static byte[] decodeBase32(String secret) {
        if (secret == null) {
            return null;
        }

        String clean = secret
                .trim()
                .toUpperCase()
                .replaceAll("[\\s=-]", "");

        if (clean.isEmpty() || !clean.matches("^[A-Z2-7]+$")) {
            return null;
        }

        int expectedBytes = (clean.length() * 5) / 8;
        if (expectedBytes <= 0) {
            return null;
        }

        byte[] result = new byte[expectedBytes];

        int buffer = 0;
        int bitsLeft = 0;
        int index = 0;

        for (char c : clean.toCharArray()) {
            int value = BASE32_ALPHABET.indexOf(c);

            if (value < 0) {
                return null;
            }

            buffer = (buffer << 5) | value;
            bitsLeft += 5;

            if (bitsLeft >= 8) {
                bitsLeft -= 8;

                if (index < result.length) {
                    result[index++] =
                            (byte) ((buffer >> bitsLeft) & 0xFF);
                }
            }
        }

        return result;
    }

    private static String encodeBase32(byte[] data) {
        if (data == null || data.length == 0) {
            throw new IllegalArgumentException("Secret data is required");
        }

        StringBuilder result = new StringBuilder((data.length * 8 + 4) / 5);

        int buffer = 0;
        int bitsLeft = 0;

        for (byte value : data) {
            buffer = (buffer << 8) | (value & 0xFF);
            bitsLeft += 8;

            while (bitsLeft >= 5) {
                bitsLeft -= 5;
                result.append(
                        BASE32_ALPHABET.charAt((buffer >> bitsLeft) & 0x1F)
                );
            }
        }

        if (bitsLeft > 0) {
            result.append(
                    BASE32_ALPHABET.charAt((buffer << (5 - bitsLeft)) & 0x1F)
            );
        }

        return result.toString();
    }

    private static String urlEncode(String value) {
        try {
            return URLEncoder.encode(value, StandardCharsets.UTF_8)
                    .replace("+", "%20");
        } catch (Exception e) {
            throw new IllegalStateException("Failed to encode MFA provisioning URI", e);
        }
    }
}

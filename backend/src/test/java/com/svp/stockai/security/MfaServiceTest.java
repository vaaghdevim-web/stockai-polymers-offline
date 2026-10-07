package com.svp.stockai.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("MfaService TOTP RFC 6238 Verification Unit Tests")
class MfaServiceTest {

    private final MfaService mfaService = new MfaService();
    private final String secret = "JBSWY3DPEHPK3PXP";

    @Test
    @DisplayName("Verify valid TOTP generated for current timestamp")
    void testVerifyValidTotp() {
        long currentStep = Instant.now().getEpochSecond() / 30;
        int validCode = mfaService.generateTotp(MfaService.decodeBase32(secret), currentStep);

        boolean isValid = mfaService.verifyTotp(secret, validCode);
        assertThat(isValid).isTrue();
    }

    @Test
    @DisplayName("Verify tolerance window for -30s drift")
    void testVerifyDriftTolerancePreviousStep() {
        long previousStep = (Instant.now().getEpochSecond() / 30) - 1;
        int previousCode = mfaService.generateTotp(MfaService.decodeBase32(secret), previousStep);

        boolean isValid = mfaService.verifyTotp(secret, previousCode);
        assertThat(isValid).isTrue();
    }

    @Test
    @DisplayName("Reject invalid 6-digit TOTP code")
    void testRejectInvalidTotpCode() {
        boolean isValid = mfaService.verifyTotp(secret, 999999);
        // Note: 999999 might randomly match in 1/1,000,000, but is not the calculated hash
        long currentStep = Instant.now().getEpochSecond() / 30;
        int validCode = mfaService.generateTotp(MfaService.decodeBase32(secret), currentStep);
        int invalidCode = (validCode + 12345) % 1_000_000;

        assertThat(mfaService.verifyTotp(secret, invalidCode)).isFalse();
    }

    @Test
    @DisplayName("Reject null or blank secrets")
    void testRejectNullOrBlankSecret() {
        assertThat(mfaService.verifyTotp(null, 123456)).isFalse();
        assertThat(mfaService.verifyTotp("", 123456)).isFalse();
        assertThat(mfaService.verifyTotp(secret, -5)).isFalse();
        assertThat(mfaService.verifyTotp(secret, 1_000_000)).isFalse();
    }
}

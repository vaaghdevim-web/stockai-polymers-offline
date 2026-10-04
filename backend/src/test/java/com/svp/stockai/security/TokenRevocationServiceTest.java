package com.svp.stockai.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("TokenRevocationService Unit Tests")
class TokenRevocationServiceTest {

    private TokenRevocationService tokenRevocationService;

    @BeforeEach
    void setUp() {
        tokenRevocationService = new TokenRevocationService();
    }

    @Test
    @DisplayName("Revoke token and confirm it is detected as revoked")
    void testRevokeToken() {
        String token = "sample.valid.jwt.token";
        assertThat(tokenRevocationService.isRevoked(token)).isFalse();

        tokenRevocationService.revoke(token);
        assertThat(tokenRevocationService.isRevoked(token)).isTrue();
    }

    @Test
    @DisplayName("Null or blank tokens are not marked as revoked")
    void testNullOrBlankToken() {
        assertThat(tokenRevocationService.isRevoked(null)).isFalse();
        assertThat(tokenRevocationService.isRevoked("")).isFalse();
        assertThat(tokenRevocationService.isRevoked("   ")).isFalse();

        tokenRevocationService.revoke(null);
        tokenRevocationService.revoke("");
        assertThat(tokenRevocationService.isRevoked("")).isFalse();
    }

    @Test
    @DisplayName("Clear all revoked tokens")
    void testClearRevokedTokens() {
        tokenRevocationService.revoke("token1");
        tokenRevocationService.revoke("token2");

        assertThat(tokenRevocationService.isRevoked("token1")).isTrue();
        assertThat(tokenRevocationService.isRevoked("token2")).isTrue();

        tokenRevocationService.clear();

        assertThat(tokenRevocationService.isRevoked("token1")).isFalse();
        assertThat(tokenRevocationService.isRevoked("token2")).isFalse();
    }
}

package com.svp.stockai.security;

import com.svp.stockai.auth.AuthService;
import com.svp.stockai.auth.LoginRequest;
import com.svp.stockai.auth.LoginResponse;
import com.svp.stockai.entity.AppUser;
import org.springframework.security.authentication.BadCredentialsException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService Refresh Token & MFA Unit Tests")
class AuthServiceRefreshAndLogoutTest {

    @Mock
    private CustomUserDetailsService customUserDetailsService;

    @Mock
    private PasswordEncoder passwordEncoder;

    private JwtService jwtService;
    private TokenRevocationService tokenRevocationService;
    private MfaService mfaService;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey", "SVP_STOCKAI_SUPER_SECRET_KEY_FOR_JWT_SECURITY_2026_TEST_KEY");
        ReflectionTestUtils.setField(jwtService, "expirationTime", 3600000L);

        tokenRevocationService = new TokenRevocationService();
        mfaService = new MfaService();

        authService = new AuthService(customUserDetailsService, passwordEncoder, jwtService);
        ReflectionTestUtils.setField(authService, "tokenRevocationService", tokenRevocationService);
        ReflectionTestUtils.setField(authService, "mfaService", mfaService);
    }

    @Test
    @DisplayName("Login issues both access token and refresh token for standard operator")
    void testLoginIssuesBothTokens() {
        AppUser user = AppUser.builder().userId(2L).userName("operator").passwordHash("hashed").isActive(true).build();
        when(customUserDetailsService.loadActiveUser("operator")).thenReturn(user);
        when(passwordEncoder.matches("password123", "hashed")).thenReturn(true);
        when(customUserDetailsService.loadAuthorities(user)).thenReturn(List.of(new SimpleGrantedAuthority("ROLE_OPERATOR")));

        LoginRequest request = LoginRequest.builder()
                .usernameOrEmail("operator")
                .password("password123")
                .build();

        LoginResponse response = authService.login(request);

        assertThat(response.getToken()).isNotBlank();
        assertThat(response.getRefreshToken()).isNotBlank();
        assertThat(response.getUserName()).isEqualTo("operator");
        assertThat(jwtService.isRefreshToken(response.getRefreshToken())).isTrue();
        assertThat(jwtService.isRefreshToken(response.getToken())).isFalse();
    }

    @Test
    @DisplayName("Admin login without MFA code is rejected")
    void testAdminLoginWithoutMfaDuringBootstrapSucceeds() {
        AppUser user = AppUser.builder().userId(1L).userName("admin").passwordHash("hashed").mfaSecret("JBSWY3DPEHPK3PXP").mfaEnabled(true).isActive(true).build();
        when(customUserDetailsService.loadActiveUser("admin")).thenReturn(user);
        when(passwordEncoder.matches("password123", "hashed")).thenReturn(true);
        when(customUserDetailsService.loadAuthorities(user)).thenReturn(List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        LoginRequest request = LoginRequest.builder()
                .usernameOrEmail("admin")
                .password("password123")
                .build();

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("MFA TOTP code is required for administrator accounts");
    }

    @Test
    @DisplayName("RefreshToken exchanges valid refresh token for fresh access token")
    void testRefreshTokenFlow() {
        AppUser user = AppUser.builder().userId(2L).userName("operator").isActive(true).build();
        when(customUserDetailsService.loadActiveUser("operator")).thenReturn(user);
        when(customUserDetailsService.loadAuthorities(user)).thenReturn(List.of(new SimpleGrantedAuthority("ROLE_OPERATOR")));

        String refreshToken = jwtService.generateRefreshToken("operator", 2L);

        LoginResponse refreshed = authService.refreshToken(refreshToken);

        assertThat(refreshed.getToken()).isNotBlank();
        assertThat(refreshed.getRefreshToken()).isNotBlank();
        assertThat(refreshed.getUserName()).isEqualTo("operator");

        // Old refresh token is revoked
        assertThat(tokenRevocationService.isRevoked(refreshToken)).isTrue();

        // Attempting to use the old refresh token again is rejected
        assertThatThrownBy(() -> authService.refreshToken(refreshToken))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("revoked");
    }

    @Test
    @DisplayName("RefreshToken rejects access tokens passed as refresh tokens")
    void testRejectAccessTokenAsRefreshToken() {
        String accessToken = jwtService.generateToken("admin", 1L, List.of("ADMIN"));

        assertThatThrownBy(() -> authService.refreshToken(accessToken))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Invalid or expired refresh token");
    }

    @Test
    @DisplayName("Login verifies TOTP code when provided with stored per-user secret")
    void testLoginWithValidTotpCode() {
        AppUser user = AppUser.builder().userId(1L).userName("admin").passwordHash("hashed").mfaSecret("JBSWY3DPEHPK3PXP").mfaEnabled(true).isActive(true).build();
        when(customUserDetailsService.loadActiveUser("admin")).thenReturn(user);
        when(passwordEncoder.matches("password123", "hashed")).thenReturn(true);
        when(customUserDetailsService.loadAuthorities(user)).thenReturn(List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        String mfaKey = "JBSWY3DPEHPK3PXP";
        long currentStep = System.currentTimeMillis() / 1000 / 30;
        int validTotp = mfaService.generateTotp(MfaService.decodeBase32(mfaKey), currentStep);

        LoginRequest request = LoginRequest.builder()
                .usernameOrEmail("admin")
                .password("password123")
                .totpCode(String.format("%06d", validTotp))
                .build();

        LoginResponse response = authService.login(request);
        assertThat(response.getToken()).isNotBlank();
    }

    @Test
    @DisplayName("Login rejects invalid TOTP code")
    void testLoginWithInvalidTotpCode() {
        AppUser user = AppUser.builder().userId(1L).userName("admin").passwordHash("hashed").mfaSecret("JBSWY3DPEHPK3PXP").mfaEnabled(true).isActive(true).build();
        when(customUserDetailsService.loadActiveUser("admin")).thenReturn(user);
        when(passwordEncoder.matches("password123", "hashed")).thenReturn(true);
        when(customUserDetailsService.loadAuthorities(user)).thenReturn(List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        LoginRequest request = LoginRequest.builder()
                .usernameOrEmail("admin")
                .password("password123")
                .totpCode("000000") // Guaranteed mismatch unless hash collision
                .build();

        String mfaKey = "JBSWY3DPEHPK3PXP";
        long currentStep = System.currentTimeMillis() / 1000 / 30;
        int validTotp = mfaService.generateTotp(MfaService.decodeBase32(mfaKey), currentStep);
        if (validTotp == 0) {
            request.setTotpCode("111111");
        }

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Invalid MFA TOTP");
    }
}

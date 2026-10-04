package com.svp.stockai.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.svp.stockai.auth.LoginRequest;
import com.svp.stockai.entity.AppRole;
import com.svp.stockai.entity.AppUser;
import com.svp.stockai.entity.UserRole;
import com.svp.stockai.repository.AppRoleRepository;
import com.svp.stockai.repository.AppUserRepository;
import com.svp.stockai.repository.UserRoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Real Spring Security Filter Chain Integration Test for Mandatory Admin MFA enforcement.
 * Validates that administrators cannot authenticate without valid TOTP codes,
 * while standard non-MFA users can log in, and MFA bypass attempts are rejected.
 */
@SpringBootTest
@AutoConfigureMockMvc // Real security filters are active (addFilters = true by default)
@ActiveProfiles("test")
@Transactional
@DisplayName("Admin MFA Enforcement Security Integration Tests (Real Filter Chain)")
public class AdminMfaEnforcementIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private AppRoleRepository roleRepository;

    @Autowired
    private UserRoleRepository userRoleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private MfaService mfaService;

    private static final String ADMIN_USER = "sec_admin_test";
    private static final String OPERATOR_USER = "sec_operator_test";
    private static final String TEST_PASSWORD = "Password@1234";
    private static final String ADMIN_MFA_SECRET = "ADMIN_SECURE_MFA_KEY_FOR_RFC6238";

    @BeforeEach
    void setUp() {
        // Ensure roles exist
        AppRole adminRole = roleRepository.findByRoleName("ADMIN")
                .orElseGet(() -> roleRepository.save(AppRole.builder().roleName("ADMIN").build()));
        AppRole operatorRole = roleRepository.findByRoleName("OPERATOR")
                .orElseGet(() -> roleRepository.save(AppRole.builder().roleName("OPERATOR").build()));

        // Create or update admin user with mfaSecret and mfaEnabled = true
        AppUser admin = userRepository.findByUserName(ADMIN_USER)
                .orElseGet(() -> userRepository.save(AppUser.builder()
                        .userName(ADMIN_USER)
                        .email("sec_admin@svp.com")
                        .passwordHash(passwordEncoder.encode(TEST_PASSWORD))
                        .mfaSecret(ADMIN_MFA_SECRET)
                        .mfaEnabled(true)
                        .isActive(true)
                        .build()));
        userRoleRepository.save(UserRole.builder().user(admin).role(adminRole).build());

        // Create or update operator user without MFA requirement
        AppUser operator = userRepository.findByUserName(OPERATOR_USER)
                .orElseGet(() -> userRepository.save(AppUser.builder()
                        .userName(OPERATOR_USER)
                        .email("sec_operator@svp.com")
                        .passwordHash(passwordEncoder.encode(TEST_PASSWORD))
                        .mfaEnabled(false)
                        .isActive(true)
                        .build()));
        userRoleRepository.save(UserRole.builder().user(operator).role(operatorRole).build());
    }

    @Test
    @DisplayName("Admin + correct password + no MFA -> 401 Unauthorized")
    void testAdminWithoutMfa_Rejects401() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .usernameOrEmail(ADMIN_USER)
                .password(TEST_PASSWORD)
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message", containsString("MFA TOTP code is required")));
    }

    @Test
    @DisplayName("Admin + correct password + invalid MFA -> 401 Unauthorized")
    void testAdminWithInvalidMfa_Rejects401() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .usernameOrEmail(ADMIN_USER)
                .password(TEST_PASSWORD)
                .totpCode("000000")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message", containsString("Invalid MFA TOTP")));
    }

    @Test
    @DisplayName("Admin + correct password + valid MFA -> 200 OK with tokens")
    void testAdminWithValidMfa_Succeeds() throws Exception {
        long currentStep = Instant.now().getEpochSecond() / 30;
        int validTotp = mfaService.generateTotp(ADMIN_MFA_SECRET.getBytes(), currentStep);

        LoginRequest request = LoginRequest.builder()
                .usernameOrEmail(ADMIN_USER)
                .password(TEST_PASSWORD)
                .totpCode(String.format("%06d", validTotp))
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.refreshToken", notNullValue()))
                .andExpect(jsonPath("$.userName", equalTo(ADMIN_USER)))
                .andExpect(jsonPath("$.roles", hasItem("ADMIN")));
    }

    @Test
    @DisplayName("Operator + correct password + no MFA -> 200 OK")
    void testOperatorWithoutMfa_Succeeds() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .usernameOrEmail(OPERATOR_USER)
                .password(TEST_PASSWORD)
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.userName", equalTo(OPERATOR_USER)))
                .andExpect(jsonPath("$.roles", hasItem("OPERATOR")));
    }

    @Test
    @DisplayName("Attempt MFA bypass through invalid refresh token endpoint -> 401 Unauthorized")
    void testMfaBypassThroughRefreshToken_Rejects401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"invalid-forged-token-attempting-bypass\"}"))
                .andExpect(status().isUnauthorized());
    }
}

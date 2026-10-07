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

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DisplayName("Admin MFA Enforcement Security Integration Tests (Real Filter Chain)")
public class AdminMfaEnforcementIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

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

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String ADMIN_USER = "sec_admin_test";
    private static final String OPERATOR_USER = "sec_operator_test";
    private static final String TEST_PASSWORD = "Password@1234";

    private String adminMfaSecret;

    @BeforeEach
    void setUp() {
        adminMfaSecret = mfaService.generateSecret();

        AppRole adminRole = roleRepository.findByRoleName("ADMIN")
                .orElseGet(() ->
                        roleRepository.save(
                                AppRole.builder()
                                        .roleName("ADMIN")
                                        .build()
                        )
                );

        AppRole operatorRole = roleRepository.findByRoleName("OPERATOR")
                .orElseGet(() ->
                        roleRepository.save(
                                AppRole.builder()
                                        .roleName("OPERATOR")
                                        .build()
                        )
                );

        AppUser admin = userRepository.findByUserName(ADMIN_USER)
                .orElseGet(() ->
                        userRepository.save(
                                AppUser.builder()
                                        .userName(ADMIN_USER)
                                        .email("sec_admin@svp.com")
                                        .passwordHash(
                                                passwordEncoder.encode(TEST_PASSWORD)
                                        )
                                        .mfaSecret(adminMfaSecret)
                                        .mfaEnabled(true)
                                        .isActive(true)
                                        .build()
                        )
                );

        admin.setMfaSecret(adminMfaSecret);
        admin.setMfaEnabled(true);
        userRepository.save(admin);

        userRoleRepository.save(
                UserRole.builder()
                        .user(admin)
                        .role(adminRole)
                        .build()
        );

        AppUser operator = userRepository.findByUserName(OPERATOR_USER)
                .orElseGet(() ->
                        userRepository.save(
                                AppUser.builder()
                                        .userName(OPERATOR_USER)
                                        .email("sec_operator@svp.com")
                                        .passwordHash(
                                                passwordEncoder.encode(TEST_PASSWORD)
                                        )
                                        .mfaEnabled(false)
                                        .isActive(true)
                                        .build()
                        )
                );

        userRoleRepository.save(
                UserRole.builder()
                        .user(operator)
                        .role(operatorRole)
                        .build()
        );
    }

    @Test
    @DisplayName("Admin + correct password + no MFA -> 401 Unauthorized")
    void testAdminWithoutMfa_Rejects401() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .usernameOrEmail(ADMIN_USER)
                .password(TEST_PASSWORD)
                .build();

        mockMvc.perform(
                        post("/api/v1/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        objectMapper.writeValueAsString(request)
                                )
                )
                .andExpect(status().isUnauthorized())
                .andExpect(
                        jsonPath(
                                "$.message",
                                containsString("MFA TOTP code is required")
                        )
                );
    }

    @Test
    @DisplayName("Admin + correct password + invalid MFA -> 401 Unauthorized")
    void testAdminWithInvalidMfa_Rejects401() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .usernameOrEmail(ADMIN_USER)
                .password(TEST_PASSWORD)
                .totpCode("000000")
                .build();

        mockMvc.perform(
                        post("/api/v1/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        objectMapper.writeValueAsString(request)
                                )
                )
                .andExpect(status().isUnauthorized())
                .andExpect(
                        jsonPath(
                                "$.message",
                                containsString("Invalid MFA TOTP")
                        )
                );
    }

    @Test
    @DisplayName("Admin + correct password + valid MFA -> 200 OK with tokens")
    void testAdminWithValidMfa_Succeeds() throws Exception {
        long currentStep = Instant.now().getEpochSecond() / 30;

        int validTotp = mfaService.generateTotp(
                MfaService.decodeBase32(adminMfaSecret),
                currentStep
        );

        LoginRequest request = LoginRequest.builder()
                .usernameOrEmail(ADMIN_USER)
                .password(TEST_PASSWORD)
                .totpCode(String.format("%06d", validTotp))
                .build();

        mockMvc.perform(
                        post("/api/v1/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        objectMapper.writeValueAsString(request)
                                )
                )
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

        mockMvc.perform(
                        post("/api/v1/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        objectMapper.writeValueAsString(request)
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.userName", equalTo(OPERATOR_USER)))
                .andExpect(jsonPath("$.roles", hasItem("OPERATOR")));
    }

    @Test
    @DisplayName("Invalid refresh token cannot bypass MFA")
    void testMfaBypassThroughRefreshToken_Rejects401() throws Exception {
        mockMvc.perform(
                        post("/api/v1/auth/refresh")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"refreshToken\":\"invalid-forged-token-attempting-bypass\"}"
                                )
                )
                .andExpect(status().isUnauthorized());
    }
}
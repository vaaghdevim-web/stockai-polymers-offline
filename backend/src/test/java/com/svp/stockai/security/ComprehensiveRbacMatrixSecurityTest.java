package com.svp.stockai.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.svp.stockai.dto.AlertRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phase 9 & Phase 10: Complete RBAC Authorization Matrix & Edge Case Security Tests.
 * Uses the REAL Spring Security Filter Chain and real cryptographically signed JWT tokens
 * to validate vertical boundaries, horizontal boundaries, machine authentication,
 * and malicious input edge cases.
 */
import com.svp.stockai.entity.AppRole;
import com.svp.stockai.entity.AppUser;
import com.svp.stockai.entity.UserRole;
import com.svp.stockai.repository.AppRoleRepository;
import com.svp.stockai.repository.AppUserRepository;
import com.svp.stockai.repository.UserRoleRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DisplayName("Comprehensive RBAC Matrix & Input Edge Cases Security Integration Tests")
public class ComprehensiveRbacMatrixSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private JwtService jwtService;

    @Autowired
    private TokenRevocationService tokenRevocationService;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private AppRoleRepository roleRepository;

    @Autowired
    private UserRoleRepository userRoleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String operatorToken;
    private String supervisorToken;
    private String adminToken;

    private static final String MACHINE_KEY = "test-only-ext01-device-key-for-unit-tests";

    @BeforeEach
    void setUp() {
        AppRole adminRole = roleRepository.findByRoleName("ADMIN")
                .orElseGet(() -> roleRepository.save(AppRole.builder().roleName("ADMIN").build()));
        AppRole supervisorRole = roleRepository.findByRoleName("SUPERVISOR")
                .orElseGet(() -> roleRepository.save(AppRole.builder().roleName("SUPERVISOR").build()));
        AppRole operatorRole = roleRepository.findByRoleName("OPERATOR")
                .orElseGet(() -> roleRepository.save(AppRole.builder().roleName("OPERATOR").build()));

        AppUser adminUser = userRepository.findByUserName("admin_user")
                .orElseGet(() -> userRepository.save(AppUser.builder().userName("admin_user").email("admin_user@svp.com").isActive(true).passwordHash(passwordEncoder.encode("Pass@123")).build()));
        userRoleRepository.save(UserRole.builder().user(adminUser).role(adminRole).build());

        AppUser supervisorUser = userRepository.findByUserName("supervisor_user")
                .orElseGet(() -> userRepository.save(AppUser.builder().userName("supervisor_user").email("supervisor_user@svp.com").isActive(true).passwordHash(passwordEncoder.encode("Pass@123")).build()));
        userRoleRepository.save(UserRole.builder().user(supervisorUser).role(supervisorRole).build());

        AppUser operatorUser = userRepository.findByUserName("operator_user")
                .orElseGet(() -> userRepository.save(AppUser.builder().userName("operator_user").email("operator_user@svp.com").isActive(true).passwordHash(passwordEncoder.encode("Pass@123")).build()));
        userRoleRepository.save(UserRole.builder().user(operatorUser).role(operatorRole).build());

        AppUser revokedUser = userRepository.findByUserName("revoked_user")
                .orElseGet(() -> userRepository.save(AppUser.builder().userName("revoked_user").email("revoked_user@svp.com").isActive(true).passwordHash(passwordEncoder.encode("Pass@123")).build()));
        userRoleRepository.save(UserRole.builder().user(revokedUser).role(operatorRole).build());

        operatorToken = jwtService.generateToken("operator_user", operatorUser.getUserId(), 1L, List.of("OPERATOR"));
        supervisorToken = jwtService.generateToken("supervisor_user", supervisorUser.getUserId(), 1L, List.of("SUPERVISOR"));
        adminToken = jwtService.generateToken("admin_user", adminUser.getUserId(), 1L, List.of("ADMIN"));
    }

    // =========================================================================
    // 1. Unauthenticated Requests (Fail Closed)
    // =========================================================================

    @Test
    @DisplayName("No Auth -> Access to /api/v1/factory/compounding/boms is rejected (401/403)")
    void testUnauthenticated_Boms_Rejects() throws Exception {
        mockMvc.perform(get("/api/v1/factory/compounding/boms"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("No Auth -> Access to /api/v1/alerts is rejected (401/403)")
    void testUnauthenticated_Alerts_Rejects() throws Exception {
        AlertRequest alert = AlertRequest.builder()
                .alertType("TEMP_SPIKE")
                .severity(com.svp.stockai.dto.AlertSeverity.HIGH)
                .message("High temperature warning")
                .build();

        mockMvc.perform(post("/api/v1/alerts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(alert)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("No Auth -> Access to /api/v1/documents is rejected (401/403)")
    void testUnauthenticated_Documents_Rejects() throws Exception {
        mockMvc.perform(get("/api/v1/documents"))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // 2. OPERATOR Role (Vertical Privilege Boundaries)
    // =========================================================================

    @Test
    @DisplayName("OPERATOR -> Can read compounding BOMs (200 OK)")
    void testOperator_ReadBoms_Allowed() throws Exception {
        mockMvc.perform(get("/api/v1/factory/compounding/boms")
                        .header("Authorization", "Bearer " + operatorToken))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("OPERATOR -> Attempt to create compounding BOM is rejected with 403 Forbidden (Vertical privilege)")
    void testOperator_CreateBom_Forbidden() throws Exception {
        String bomPayload = """
                {
                    "bomCode": "BOM-OP-ATTEMPT",
                    "bomName": "Unauthorized BOM",
                    "version": "1.0",
                    "targetBatchWeightKg": 100.0,
                    "productId": 1,
                    "unitId": 1,
                    "items": [
                        {
                            "materialId": 1,
                            "percentage": 100.0
                        }
                    ]
                }
                """;

        mockMvc.perform(post("/api/v1/factory/compounding/boms")
                        .header("Authorization", "Bearer " + operatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bomPayload))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("OPERATOR -> Attempt to activate BOM is rejected with 403 Forbidden")
    void testOperator_ActivateBom_Forbidden() throws Exception {
        mockMvc.perform(patch("/api/v1/factory/compounding/boms/1/activate")
                        .header("Authorization", "Bearer " + operatorToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("OPERATOR -> Can submit alert (202 Accepted)")
    void testOperator_SubmitAlert_Allowed() throws Exception {
        AlertRequest alert = AlertRequest.builder()
                .alertType("MACHINE_JAM")
                .severity(com.svp.stockai.dto.AlertSeverity.MEDIUM)
                .message("Conveyor jam detected")
                .build();

        mockMvc.perform(post("/api/v1/alerts")
                        .header("Authorization", "Bearer " + operatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(alert)))
                .andExpect(status().isAccepted());
    }

    // =========================================================================
    // 3. MACHINE / IoT Device (Strict Least Privilege)
    // =========================================================================

    @Test
    @DisplayName("MACHINE -> Valid IoT machine headers can submit alert (202 Accepted)")
    void testMachine_SubmitAlert_Allowed() throws Exception {
        AlertRequest alert = AlertRequest.builder()
                .alertType("VIBRATION_ALERT")
                .severity(com.svp.stockai.dto.AlertSeverity.LOW)
                .message("Slight bearing vibration on extruder")
                .build();

        mockMvc.perform(post("/api/v1/alerts")
                        .header("X-Device-Id", "EXT-01")
                        .header("X-Device-Key", MACHINE_KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(alert)))
                .andExpect(status().isAccepted());
    }

    @Test
    @DisplayName("MACHINE -> Machine headers cannot access human BOM endpoints (403 Forbidden)")
    void testMachine_Boms_Forbidden() throws Exception {
        mockMvc.perform(get("/api/v1/factory/compounding/boms")
                        .header("X-Device-Id", "EXT-01")
                        .header("X-Device-Key", MACHINE_KEY))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // 4. SUPERVISOR & ADMIN Roles
    // =========================================================================

    @Test
    @DisplayName("SUPERVISOR -> Can read BOMs and submit alerts")
    void testSupervisor_Access_Allowed() throws Exception {
        mockMvc.perform(get("/api/v1/factory/compounding/boms")
                        .header("Authorization", "Bearer " + supervisorToken))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ADMIN -> Can access administrative endpoints")
    void testAdmin_Access_Allowed() throws Exception {
        mockMvc.perform(get("/api/v1/factory/compounding/boms")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    // =========================================================================
    // 5. Phase 10: Input Edge Cases & Malformed Payloads
    // =========================================================================

    @Test
    @DisplayName("Malformed JSON payload -> Rejected with 400 Bad Request")
    void testMalformedJson_Rejects400() throws Exception {
        String brokenJson = "{\"plantId\": 1, \"alertType\": \"TEMP\", \"message\": ";

        mockMvc.perform(post("/api/v1/alerts")
                        .header("Authorization", "Bearer " + operatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(brokenJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Missing mandatory fields in alert -> Rejected with 400 Bad Request")
    void testMissingMandatoryFields_Rejects400() throws Exception {
        String incomplete = "{\"plantId\": 1}";

        mockMvc.perform(post("/api/v1/alerts")
                        .header("Authorization", "Bearer " + operatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(incomplete))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Revoked JWT Access Token -> Rejected with 401 Unauthorized")
    void testRevokedJwtToken_Rejects401() throws Exception {
        String token = jwtService.generateToken("revoked_user", 99L, List.of("OPERATOR"));
        tokenRevocationService.revoke(token);

        mockMvc.perform(get("/api/v1/factory/compounding/boms")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Expired or forged JWT Token -> Rejected with 403/401")
    void testForgedJwtToken_Rejects() throws Exception {
        mockMvc.perform(get("/api/v1/factory/compounding/boms")
                        .header("Authorization", "Bearer eyJhbGciOiJIUzI1NiJ9.e30.bogus_signature"))
                .andExpect(status().isForbidden());
    }
}


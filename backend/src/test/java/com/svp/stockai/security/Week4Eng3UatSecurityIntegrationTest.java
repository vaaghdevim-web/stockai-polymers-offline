package com.svp.stockai.security;

import com.svp.stockai.auth.AuthService;
import com.svp.stockai.auth.LoginRequest;
import com.svp.stockai.auth.LoginResponse;
import com.svp.stockai.dto.AlertAcceptedResponse;
import com.svp.stockai.dto.FinishedGoodsMetricsResponse;
import com.svp.stockai.dto.PalletResponse;
import com.svp.stockai.entity.AppUser;
import com.svp.stockai.service.AlertService;
import com.svp.stockai.service.FinishedGoodsMetricsService;
import com.svp.stockai.service.IoTTelemetryIngestionService;
import com.svp.stockai.service.PalletService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Date;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = true)
@ActiveProfiles("test")
@DisplayName("Week 4 Engineer 3 — UAT & RBAC Security Integration Suite")
class Week4Eng3UatSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private FinishedGoodsMetricsService finishedGoodsMetricsService;

    @MockitoBean
    private PalletService palletService;

    @MockitoBean
    private AlertService alertService;

    @MockitoBean
    private IoTTelemetryIngestionService iotTelemetryIngestionService;

    // =========================================================================
    // 1. AUTHENTICATION & LOGIN UAT FLOWS
    // =========================================================================

    @Test
    @DisplayName("UAT-AUTH-01: Valid user login generates 200 OK with JWT and role mapping")
    void uat_validUserLogin_returns200AndJwt() throws Exception {
        LoginResponse loginResponse = new LoginResponse(
                "mocked.jwt.token", "Bearer", 101L, "supervisor01", "supervisor@svp.com", List.of("SUPERVISOR")
        );
        when(authService.login(any(LoginRequest.class))).thenReturn(loginResponse);

        String loginJson = """
                {
                    "usernameOrEmail": "supervisor01",
                    "password": "ValidPassword123"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("mocked.jwt.token"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.userId").value(101))
                .andExpect(jsonPath("$.userName").value("supervisor01"))
                .andExpect(jsonPath("$.roles[0]").value("SUPERVISOR"));
    }

    @Test
    @DisplayName("UAT-AUTH-02: Bad credentials returns 401 Unauthorized via GlobalExceptionHandler")
    void uat_badCredentials_returns401Unauthorized() throws Exception {
        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new BadCredentialsException("Invalid username or password"));

        String badLoginJson = """
                {
                    "usernameOrEmail": "operator01",
                    "password": "WrongPassword"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(badLoginJson))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    @Test
    @DisplayName("UAT-AUTH-03: Inactive or unknown user returns 401 Unauthorized")
    void uat_inactiveUser_returns401Unauthorized() throws Exception {
        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new UsernameNotFoundException("User is inactive"));

        String inactiveUserJson = """
                {
                    "usernameOrEmail": "inactive_user",
                    "password": "Password123"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(inactiveUserJson))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("UAT-AUTH-04: Blank login credentials rejected with 400 Bad Request")
    void uat_blankLoginCredentials_returns400BadRequest() throws Exception {
        String blankJson = """
                {
                    "usernameOrEmail": "",
                    "password": ""
                }
                """;

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(blankJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Validation failed"));
    }

    // =========================================================================
    // 2. RBAC AUTHORIZATION UAT FLOWS (ADMIN / OPERATOR / SUPERVISOR)
    // =========================================================================

    @Test
    @DisplayName("UAT-RBAC-01: SUPERVISOR role is permitted on finished-goods metrics endpoint")
    void uat_supervisorAccess_permittedOnMetrics() throws Exception {
        String token = jwtService.generateToken("supervisor01", 10L, List.of("SUPERVISOR"));
        AppUser user = AppUser.builder().userId(10L).userName("supervisor01").isActive(true).build();

        when(customUserDetailsService.loadActiveUser("supervisor01")).thenReturn(user);
        when(customUserDetailsService.loadAuthorities(user))
                .thenReturn(List.of(new SimpleGrantedAuthority("ROLE_SUPERVISOR")));
        when(finishedGoodsMetricsService.getMetrics(50L))
                .thenReturn(FinishedGoodsMetricsResponse.builder().productionId(50L).build());

        mockMvc.perform(get("/api/v1/finished-goods/production/50/metrics")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productionId").value(50));
    }

    @Test
    @DisplayName("UAT-RBAC-02: SUPERVISOR role is permitted on pallet creation endpoint")
    void uat_supervisorAccess_permittedOnPallets() throws Exception {
        String token = jwtService.generateToken("supervisor01", 10L, List.of("SUPERVISOR"));
        AppUser user = AppUser.builder().userId(10L).userName("supervisor01").isActive(true).build();

        when(customUserDetailsService.loadActiveUser("supervisor01")).thenReturn(user);
        when(customUserDetailsService.loadAuthorities(user))
                .thenReturn(List.of(new SimpleGrantedAuthority("ROLE_SUPERVISOR")));
        when(palletService.createPallet(any()))
                .thenReturn(PalletResponse.builder().palletId(200L).palletCode("PAL-20260908-SUPER").build());

        String json = """
                {
                    "finishedBatchId": 1,
                    "warehouseId": 1,
                    "quantity": 250.00
                }
                """;

        mockMvc.perform(post("/api/v1/pallets")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.palletId").value(200))
                .andExpect(jsonPath("$.palletCode").value("PAL-20260908-SUPER"));
    }

    @Test
    @DisplayName("UAT-RBAC-03: SUPERVISOR role is permitted on async alert endpoint")
    void uat_supervisorAccess_permittedOnAsyncAlerts() throws Exception {
        String token = jwtService.generateToken("supervisor01", 10L, List.of("SUPERVISOR"));
        AppUser user = AppUser.builder().userId(10L).userName("supervisor01").isActive(true).build();

        when(customUserDetailsService.loadActiveUser("supervisor01")).thenReturn(user);
        when(customUserDetailsService.loadAuthorities(user))
                .thenReturn(List.of(new SimpleGrantedAuthority("ROLE_SUPERVISOR")));
        when(alertService.submitAlert(any()))
                .thenReturn(AlertAcceptedResponse.builder()
                        .status("ACCEPTED")
                        .message("Alert accepted for background processing")
                        .correlationId("corr-sup-999")
                        .timestamp(Instant.now())
                        .build());

        String json = """
                {
                    "alertType": "SUPERVISOR_LINE_INSPECTION",
                    "severity": "HIGH",
                    "message": "Quality check deviation observed on Loom #4"
                }
                """;

        mockMvc.perform(post("/api/v1/alerts/async")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.correlationId").value("corr-sup-999"));
    }

    @Test
    @DisplayName("UAT-RBAC-04: Unauthorized / Anonymous request rejected with 403 Forbidden")
    void uat_anonymousAccess_rejected() throws Exception {
        mockMvc.perform(get("/api/v1/finished-goods/production/1/metrics"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("UAT-RBAC-05: Malformed JWT token rejected with 403 Forbidden")
    void uat_malformedJwt_rejected() throws Exception {
        mockMvc.perform(get("/api/v1/finished-goods/production/1/metrics")
                        .header("Authorization", "Bearer invalid.tampered.token"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("UAT-RBAC-06: Non-whitelisted role (e.g. AUDITOR / VIEWER) forbidden from creating pallets")
    void uat_auditorRole_forbiddenFromPalletCreation() throws Exception {
        String token = jwtService.generateToken("auditor01", 99L, List.of("AUDITOR"));
        AppUser user = AppUser.builder().userId(99L).userName("auditor01").isActive(true).build();

        when(customUserDetailsService.loadActiveUser("auditor01")).thenReturn(user);
        when(customUserDetailsService.loadAuthorities(user))
                .thenReturn(List.of(new SimpleGrantedAuthority("ROLE_AUDITOR")));

        String json = """
                {
                    "finishedBatchId": 1,
                    "warehouseId": 1,
                    "quantity": 100
                }
                """;

        mockMvc.perform(post("/api/v1/pallets")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isForbidden());
    }
}


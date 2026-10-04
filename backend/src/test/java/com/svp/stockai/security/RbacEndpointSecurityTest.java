package com.svp.stockai.security;

import com.svp.stockai.entity.AppUser;
import com.svp.stockai.service.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = true)
@ActiveProfiles("test")
@DisplayName("IAM RBAC Endpoint Protection Tests")
class RbacEndpointSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private TokenRevocationService tokenRevocationService;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @MockitoBean
    private ProductionStateService productionStateService;

    @MockitoBean
    private CompoundingBomService compoundingBomService;

    @MockitoBean
    private RawMaterialReceiptService rawMaterialReceiptService;

    @MockitoBean
    private RawMaterialQueryService rawMaterialQueryService;

    @MockitoBean
    private MachineCacheService machineCacheService;

    @Test
    @DisplayName("Reject unauthenticated access to production stages with 403")
    void testUnauthenticatedProductionStageAccess() throws Exception {
        mockMvc.perform(post("/api/v1/production-runs/1/stages/1/start"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Reject unauthorized role (AUDITOR) on production stages with 403")
    void testAuditorRoleForbiddenOnProductionStage() throws Exception {
        String token = jwtService.generateToken("auditor_user", 50L, List.of("AUDITOR"));
        AppUser user = AppUser.builder().userId(50L).userName("auditor_user").isActive(true).build();

        when(customUserDetailsService.loadActiveUser("auditor_user")).thenReturn(user);
        when(customUserDetailsService.loadAuthorities(user))
                .thenReturn(List.of(new SimpleGrantedAuthority("ROLE_AUDITOR")));

        mockMvc.perform(post("/api/v1/production-runs/1/stages/1/start")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Reject unauthorized role (OPERATOR) on BOM activation (requires ADMIN/SUPERVISOR)")
    void testOperatorForbiddenOnBomActivation() throws Exception {
        String token = jwtService.generateToken("operator_user", 60L, List.of("OPERATOR"));
        AppUser user = AppUser.builder().userId(60L).userName("operator_user").isActive(true).build();

        when(customUserDetailsService.loadActiveUser("operator_user")).thenReturn(user);
        when(customUserDetailsService.loadAuthorities(user))
                .thenReturn(List.of(new SimpleGrantedAuthority("ROLE_OPERATOR")));

        mockMvc.perform(patch("/api/v1/factory/compounding/boms/1/activate")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Reject revoked token with 401 Unauthorized")
    void testRevokedTokenIsRejected() throws Exception {
        String token = jwtService.generateToken("revoked_user", 70L, List.of("ADMIN"));
        AppUser user = AppUser.builder().userId(70L).userName("revoked_user").isActive(true).build();

        when(customUserDetailsService.loadActiveUser("revoked_user")).thenReturn(user);
        when(customUserDetailsService.loadAuthorities(user))
                .thenReturn(List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        tokenRevocationService.revoke(token);

        mockMvc.perform(get("/api/v1/machines/active")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());

        // Cleanup
        tokenRevocationService.clear();
    }
}

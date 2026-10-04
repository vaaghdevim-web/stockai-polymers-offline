package com.svp.stockai.security;

import com.svp.stockai.dto.FinishedGoodsMetricsResponse;
import com.svp.stockai.dto.PalletResponse;
import com.svp.stockai.entity.AppUser;
import com.svp.stockai.service.FinishedGoodsMetricsService;
import com.svp.stockai.service.PalletService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = true)
@ActiveProfiles("test")
class Week2Eng3SecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @MockitoBean
    private FinishedGoodsMetricsService finishedGoodsMetricsService;

    @MockitoBean
    private PalletService palletService;

    @Test
    void unauthenticatedAccess_isRejectedOnMetricsEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/finished-goods/production/1/metrics"))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedAccess_isRejectedOnPalletsEndpoint() throws Exception {
        mockMvc.perform(post("/api/v1/pallets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"finishedBatchId\":1,\"warehouseId\":1,\"quantity\":10}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void operatorAccess_isAllowedOnMetricsEndpoint() throws Exception {
        String token = jwtService.generateToken("operator01", 1L, List.of("OPERATOR"));
        AppUser operatorUser = AppUser.builder().userId(1L).userName("operator01").isActive(true).build();

        when(customUserDetailsService.loadActiveUser("operator01")).thenReturn(operatorUser);
        when(customUserDetailsService.loadAuthorities(operatorUser))
                .thenReturn(List.of(new SimpleGrantedAuthority("ROLE_OPERATOR")));
        when(finishedGoodsMetricsService.getMetrics(1L))
                .thenReturn(FinishedGoodsMetricsResponse.builder().productionId(1L).build());

        mockMvc.perform(get("/api/v1/finished-goods/production/1/metrics")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void operatorAccess_isAllowedOnPalletsEndpoint() throws Exception {
        String token = jwtService.generateToken("operator01", 1L, List.of("OPERATOR"));
        AppUser operatorUser = AppUser.builder().userId(1L).userName("operator01").isActive(true).build();

        when(customUserDetailsService.loadActiveUser("operator01")).thenReturn(operatorUser);
        when(customUserDetailsService.loadAuthorities(operatorUser))
                .thenReturn(List.of(new SimpleGrantedAuthority("ROLE_OPERATOR")));
        when(palletService.createPallet(any()))
                .thenReturn(PalletResponse.builder().palletId(1L).build());

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
                .andExpect(status().isCreated());
    }

    @Test
    void nonPermittedRole_isForbiddenOnPalletsEndpoint() throws Exception {
        String token = jwtService.generateToken("viewer01", 2L, List.of("VIEWER"));
        AppUser viewerUser = AppUser.builder().userId(2L).userName("viewer01").isActive(true).build();

        when(customUserDetailsService.loadActiveUser("viewer01")).thenReturn(viewerUser);
        when(customUserDetailsService.loadAuthorities(viewerUser))
                .thenReturn(List.of(new SimpleGrantedAuthority("ROLE_VIEWER")));

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


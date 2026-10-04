package com.svp.stockai.controller;

import com.svp.stockai.dto.PurchaseRecommendationResponse;
import com.svp.stockai.dto.ReorderCheckSummaryResponse;
import com.svp.stockai.service.ReorderAlertService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ReorderAlertController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class ReorderAlertControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ReorderAlertService reorderAlertService;

    @Test
    @DisplayName("POST /api/v1/procurement/reorder-check returns summary")
    void triggerReorderCheck_Returns200() throws Exception {
        ReorderCheckSummaryResponse summary = ReorderCheckSummaryResponse.builder()
                .totalMaterialsEvaluated(15)
                .lowStockCount(2)
                .criticalStockCount(1)
                .newRecommendationsCreated(1)
                .scanTimestamp(Instant.now())
                .generatedRecommendations(List.of(
                        PurchaseRecommendationResponse.builder()
                                .recommendationId(1L)
                                .materialId(101L)
                                .materialCode("RM-PP-01")
                                .priority("Critical")
                                .status("New")
                                .build()
                ))
                .build();

        when(reorderAlertService.checkReorderLevels()).thenReturn(summary);

        mockMvc.perform(post("/api/v1/procurement/reorder-check"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalMaterialsEvaluated").value(15))
                .andExpect(jsonPath("$.lowStockCount").value(2))
                .andExpect(jsonPath("$.criticalStockCount").value(1))
                .andExpect(jsonPath("$.newRecommendationsCreated").value(1));
    }

    @Test
    @DisplayName("PATCH /api/v1/procurement/recommendations/{id}/approve returns approved recommendation")
    void approveRecommendation_Returns200() throws Exception {
        PurchaseRecommendationResponse response = PurchaseRecommendationResponse.builder()
                .recommendationId(1L)
                .materialId(101L)
                .materialCode("RM-PP-01")
                .recommendedDate(LocalDate.now())
                .recommendedQty(new BigDecimal("1000.0000"))
                .status("Approved")
                .priority("Critical")
                .approvedByUserName("manager1")
                .build();

        when(reorderAlertService.approveRecommendation(eq(1L), any())).thenReturn(response);

        mockMvc.perform(patch("/api/v1/procurement/recommendations/1/approve"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recommendationId").value(1))
                .andExpect(jsonPath("$.status").value("Approved"))
                .andExpect(jsonPath("$.approvedByUserName").value("manager1"));
    }
}

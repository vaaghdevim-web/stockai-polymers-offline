package com.svp.stockai.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.svp.stockai.dto.PurchaseRecommendationResponse;
import com.svp.stockai.dto.ai.AiQueryRequest;
import com.svp.stockai.dto.ai.AiQueryResponse;
import com.svp.stockai.dto.ai.MaterialForecastResponse;
import com.svp.stockai.dto.ai.QcRootCauseResponse;
import com.svp.stockai.dto.ai.SupplierScoreResponse;
import com.svp.stockai.service.AiAnalyticsService;
import com.svp.stockai.service.AiCopilotService;
import com.svp.stockai.service.ReorderAlertService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AiController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class AiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private AiAnalyticsService aiAnalyticsService;

    @MockitoBean
    private AiCopilotService aiCopilotService;

    @MockitoBean
    private ReorderAlertService reorderAlertService;

    @Test
    @DisplayName("POST /api/v1/ai/query returns copilot response")
    void testProcessCopilotQuery() throws Exception {
        AiQueryResponse response = new AiQueryResponse(
                "How much PP do we have?",
                "INVENTORY_LOOKUP",
                0.95,
                "Currently holding 50,000 KG of PP Homopolymer.",
                List.of(),
                List.of("View forecast")
        );

        when(aiCopilotService.processQuery(any(AiQueryRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/ai/query")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AiQueryRequest("How much PP do we have?", null, null))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.intent").value("INVENTORY_LOOKUP"))
                .andExpect(jsonPath("$.answer").value("Currently holding 50,000 KG of PP Homopolymer."));
    }

    @Test
    @DisplayName("GET /api/v1/ai/forecast returns demand forecasting list")
    void testGetDemandForecast() throws Exception {
        MaterialForecastResponse forecast = new MaterialForecastResponse(
                1L,
                "RM-PP-01",
                "PP Homopolymer",
                "Polymer",
                "KG",
                BigDecimal.valueOf(50000),
                BigDecimal.valueOf(10000),
                BigDecimal.valueOf(12500),
                BigDecimal.valueOf(12875),
                3,
                "CRITICAL",
                94.5,
                "Stock critically low",
                List.of()
        );

        when(aiAnalyticsService.generateDemandForecast(null, 30)).thenReturn(List.of(forecast));

        mockMvc.perform(get("/api/v1/ai/forecast"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].materialCode").value("RM-PP-01"))
                .andExpect(jsonPath("$[0].stockHealthStatus").value("CRITICAL"));
    }

    @Test
    @DisplayName("GET /api/v1/ai/suppliers/ranking returns supplier matrix")
    void testGetSupplierRankings() throws Exception {
        SupplierScoreResponse score = new SupplierScoreResponse(
                1L,
                "Reliance Industries Limited",
                "27AAACR5055K1Z0",
                92.4,
                96.0,
                92.0,
                88.0,
                24,
                2.1,
                "LOW_RISK",
                List.of("PP Homopolymer"),
                "Preferred vendor"
        );

        when(aiAnalyticsService.evaluateSupplierPerformance()).thenReturn(List.of(score));

        mockMvc.perform(get("/api/v1/ai/suppliers/ranking"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].supplierName").value("Reliance Industries Limited"))
                .andExpect(jsonPath("$[0].riskTier").value("LOW_RISK"));
    }

    @Test
    @DisplayName("GET /api/v1/ai/qc/root-cause returns defect telemetry diagnostics")
    void testGetQcRootCauses() throws Exception {
        QcRootCauseResponse rootCause = new QcRootCauseResponse(
                "QC-001",
                "LOT-001",
                "PP Fabric Tape",
                "EXTRUSION_TAPE",
                "Tensile strength low",
                0.75,
                91.0,
                "Die zone temp variance",
                List.of(),
                List.of("Calibrate temperature"),
                Instant.now()
        );

        when(aiAnalyticsService.analyzeQcRootCauses(null)).thenReturn(List.of(rootCause));

        mockMvc.perform(get("/api/v1/ai/qc/root-cause"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].inspectionNumber").value("QC-001"))
                .andExpect(jsonPath("$[0].primaryRootCause").value("Die zone temp variance"));
    }

    @Test
    @DisplayName("GET /api/v1/ai/reorder-recommendations returns purchase proposals")
    void testGetReorderRecommendations() throws Exception {
        PurchaseRecommendationResponse rec = PurchaseRecommendationResponse.builder()
                .recommendationId(1L)
                .materialCode("RM-PP-01")
                .materialName("PP Homopolymer")
                .priority("Critical")
                .status("New")
                .build();

        when(reorderAlertService.getRecommendations(null, null)).thenReturn(List.of(rec));

        mockMvc.perform(get("/api/v1/ai/reorder-recommendations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].materialCode").value("RM-PP-01"))
                .andExpect(jsonPath("$[0].priority").value("Critical"));
    }
}

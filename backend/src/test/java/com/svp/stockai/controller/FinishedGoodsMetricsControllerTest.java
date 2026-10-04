package com.svp.stockai.controller;

import com.svp.stockai.dto.FinishedGoodsMetricsResponse;
import com.svp.stockai.service.FinishedGoodsMetricsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(FinishedGoodsMetricsController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class FinishedGoodsMetricsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FinishedGoodsMetricsService finishedGoodsMetricsService;

    @Test
    void getMetrics_returns200WithCalculatedMetrics() throws Exception {
        FinishedGoodsMetricsResponse response = FinishedGoodsMetricsResponse.builder()
                .productionId(42L)
                .inputWeightKg(new BigDecimal("1000.0000"))
                .outputWeightKg(new BigDecimal("950.0000"))
                .scrapWeightKg(new BigDecimal("50.0000"))
                .yieldPercentage(new BigDecimal("95.00"))
                .scrapPercentage(new BigDecimal("5.00"))
                .bagsProduced(1900)
                .averageBagWeightG(new BigDecimal("500.00"))
                .bagsPerKg(new BigDecimal("2.00"))
                .build();

        when(finishedGoodsMetricsService.getMetrics(42L)).thenReturn(response);

        mockMvc.perform(get("/api/v1/finished-goods/production/42/metrics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productionId").value(42))
                .andExpect(jsonPath("$.inputWeightKg").value(1000.0))
                .andExpect(jsonPath("$.outputWeightKg").value(950.0))
                .andExpect(jsonPath("$.scrapWeightKg").value(50.0))
                .andExpect(jsonPath("$.yieldPercentage").value(95.0))
                .andExpect(jsonPath("$.scrapPercentage").value(5.0))
                .andExpect(jsonPath("$.bagsProduced").value(1900))
                .andExpect(jsonPath("$.averageBagWeightG").value(500.0))
                .andExpect(jsonPath("$.bagsPerKg").value(2.0));
    }

    @Test
    void getMetrics_returns404WhenProductionNotFound() throws Exception {
        when(finishedGoodsMetricsService.getMetrics(999L))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Production run 999 was not found"));

        mockMvc.perform(get("/api/v1/finished-goods/production/999/metrics"))
                .andExpect(status().isNotFound());
    }
}


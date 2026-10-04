package com.svp.stockai.controller;

import com.svp.stockai.entity.Bom;
import com.svp.stockai.entity.FinishedProduct;
import com.svp.stockai.entity.Plant;
import com.svp.stockai.entity.ProductionRun;
import com.svp.stockai.entity.ProductionStage;
import com.svp.stockai.entity.ProductionUnit;
import com.svp.stockai.repository.ProductionRunRepository;
import com.svp.stockai.repository.ProductionStageRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({ProductionRunController.class, WipController.class})
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class ProductionRunControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProductionRunRepository productionRunRepository;

    @MockitoBean
    private ProductionStageRepository productionStageRepository;

    private ProductionRun createSampleRun(Long id, String prNumber, String status) {
        Plant plant = Plant.builder().plantId(1L).plantName("Unit 1 Plant").build();
        FinishedProduct product = FinishedProduct.builder()
                .productId(101L)
                .productName("50KG PP Fertilizer Bag")
                .productCode("FP-BAG-50KG-01")
                .build();
        Bom bom = Bom.builder().bomId(201L).product(product).build();

        return ProductionRun.builder()
                .productionId(id)
                .plant(plant)
                .bom(bom)
                .productionNumber(prNumber)
                .status(status)
                .plannedQty(BigDecimal.valueOf(5000))
                .actualQty(BigDecimal.valueOf(3200))
                .inputWeightKg(BigDecimal.valueOf(420))
                .outputWeightKg(BigDecimal.valueOf(410))
                .scrapWeightKg(BigDecimal.valueOf(10))
                .yieldPercentage(BigDecimal.valueOf(97.619))
                .bagsProduced(BigDecimal.valueOf(3200))
                .bagsPerKg(BigDecimal.valueOf(7.8))
                .startDatetime(OffsetDateTime.now())
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();
    }

    private ProductionStage createSampleStage(Long stageId, Long runId, int seq, String status, String unitName) {
        ProductionUnit unit = ProductionUnit.builder().unitId(10L).unitCode("PU-EXT-01").unitName(unitName).unitType("Extrusion").build();
        return ProductionStage.builder()
                .stageId(stageId)
                .productionRun(ProductionRun.builder().productionId(runId).build())
                .unit(unit)
                .sequenceNo(seq)
                .status(status)
                .inputWeightKg(BigDecimal.valueOf(420))
                .outputWeightKg(BigDecimal.valueOf(410))
                .scrapWeightKg(BigDecimal.valueOf(10))
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/production-runs returns 200 with enriched product details")
    void testGetAllProductionRuns() throws Exception {
        ProductionRun run = createSampleRun(1L, "PR-2026-001", "InProgress");
        ProductionStage stage = createSampleStage(100L, 1L, 1, "Running", "Extrusion Unit");

        when(productionRunRepository.findAll()).thenReturn(List.of(run));
        when(productionStageRepository.findByProductionRun_ProductionIdOrderBySequenceNoAsc(1L))
                .thenReturn(List.of(stage));

        mockMvc.perform(get("/api/v1/production-runs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].productionId").value(1))
                .andExpect(jsonPath("$[0].productionNumber").value("PR-2026-001"))
                .andExpect(jsonPath("$[0].productName").value("50KG PP Fertilizer Bag"))
                .andExpect(jsonPath("$[0].productCode").value("FP-BAG-50KG-01"))
                .andExpect(jsonPath("$[0].currentStage").value("Extrusion Unit"))
                .andExpect(jsonPath("$[0].stages[0].stageName").value("Extrusion Unit"));
    }

    @Test
    @DisplayName("GET /api/v1/production (alias) returns 200 with production runs")
    void testGetProductionRunsAlias() throws Exception {
        ProductionRun run = createSampleRun(1L, "PR-2026-001", "InProgress");
        when(productionRunRepository.findAll()).thenReturn(List.of(run));
        when(productionStageRepository.findByProductionRun_ProductionIdOrderBySequenceNoAsc(1L))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/v1/production"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].productionNumber").value("PR-2026-001"));
    }

    @Test
    @DisplayName("GET /api/v1/production/runs (alias) returns 200 with production runs")
    void testGetProductionRunsSecondAlias() throws Exception {
        ProductionRun run = createSampleRun(1L, "PR-2026-001", "InProgress");
        when(productionRunRepository.findAll()).thenReturn(List.of(run));
        when(productionStageRepository.findByProductionRun_ProductionIdOrderBySequenceNoAsc(1L))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/v1/production/runs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].productionNumber").value("PR-2026-001"));
    }

    @Test
    @DisplayName("GET /api/v1/production/wip returns 200 with active WIP runs")
    void testGetWipProductionRuns() throws Exception {
        ProductionRun run = createSampleRun(1L, "PR-2026-001", "InProgress");
        when(productionRunRepository.findWipRuns()).thenReturn(List.of(run));
        when(productionStageRepository.findByProductionRun_ProductionIdOrderBySequenceNoAsc(1L))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/v1/production/wip"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].productionNumber").value("PR-2026-001"))
                .andExpect(jsonPath("$[0].status").value("InProgress"));
    }

    @Test
    @DisplayName("GET /api/v1/wip returns 200 with active WIP runs")
    void testGetDedicatedWipEndpoint() throws Exception {
        ProductionRun run = createSampleRun(1L, "PR-2026-001", "InProgress");
        when(productionRunRepository.findWipRuns()).thenReturn(List.of(run));
        when(productionStageRepository.findByProductionRun_ProductionIdOrderBySequenceNoAsc(1L))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/v1/wip"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].productionNumber").value("PR-2026-001"));
    }

    @Test
    @DisplayName("GET /api/v1/production-runs/{id} returns 200 with single run details")
    void testGetProductionRunById() throws Exception {
        ProductionRun run = createSampleRun(1L, "PR-2026-001", "InProgress");
        when(productionRunRepository.findById(1L)).thenReturn(Optional.of(run));
        when(productionStageRepository.findByProductionRun_ProductionIdOrderBySequenceNoAsc(1L))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/v1/production-runs/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productionId").value(1))
                .andExpect(jsonPath("$.productionNumber").value("PR-2026-001"));
    }
}

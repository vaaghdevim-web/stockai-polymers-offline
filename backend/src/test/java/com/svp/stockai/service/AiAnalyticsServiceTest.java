package com.svp.stockai.service;

import com.svp.stockai.dto.ai.MaterialForecastResponse;
import com.svp.stockai.dto.ai.QcRootCauseResponse;
import com.svp.stockai.dto.ai.SupplierScoreResponse;
import com.svp.stockai.entity.MaterialBatch;
import com.svp.stockai.entity.QualityInspection;
import com.svp.stockai.entity.RawMaterial;
import com.svp.stockai.entity.Supplier;
import com.svp.stockai.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AiAnalyticsServiceTest {

    private RawMaterialRepository rawMaterialRepo;
    private InventoryRepository inventoryRepo;
    private SupplierRepository supplierRepo;
    private QualityInspectionRepository qualityInspectionRepo;
    private MaterialBatchRepository materialBatchRepo;
    private MachineTelemetryLogRepository telemetryLogRepo;
    private PurchaseRecommendationRepository recommendationRepo;
    private AiAnalyticsService service;

    private RawMaterial ppMaterial;
    private Supplier reliance;

    @BeforeEach
    void setUp() {
        rawMaterialRepo = mock(RawMaterialRepository.class);
        inventoryRepo = mock(InventoryRepository.class);
        supplierRepo = mock(SupplierRepository.class);
        qualityInspectionRepo = mock(QualityInspectionRepository.class);
        materialBatchRepo = mock(MaterialBatchRepository.class);
        telemetryLogRepo = mock(MachineTelemetryLogRepository.class);
        recommendationRepo = mock(PurchaseRecommendationRepository.class);

        service = new AiAnalyticsService(
                rawMaterialRepo,
                inventoryRepo,
                supplierRepo,
                qualityInspectionRepo,
                materialBatchRepo,
                telemetryLogRepo,
                recommendationRepo
        );

        ppMaterial = RawMaterial.builder()
                .materialId(1L)
                .materialCode("RM-PP-001")
                .materialName("PP Homopolymer H030SG")
                .reorderLevel(BigDecimal.valueOf(10000))
                .isActive(true)
                .build();

        reliance = Supplier.builder()
                .supplierId(10L)
                .supplierName("Reliance Industries Limited")
                .gstNo("27AAACR5055K1Z0")
                .isActive(true)
                .build();
    }

    @Test
    @DisplayName("generateDemandForecast calculates correct 30-day projection and health status")
    void testDemandForecast() {
        when(rawMaterialRepo.findById(1L)).thenReturn(Optional.of(ppMaterial));
        when(inventoryRepo.getTotalAvailableRawMaterial(1L)).thenReturn(BigDecimal.valueOf(50000));

        List<MaterialForecastResponse> forecasts = service.generateDemandForecast(1L, 30);

        assertNotNull(forecasts);
        assertEquals(1, forecasts.size());

        MaterialForecastResponse forecast = forecasts.get(0);
        assertEquals("PP Homopolymer H030SG", forecast.materialName());
        assertEquals(BigDecimal.valueOf(50000), forecast.currentStockKg());
        assertEquals(30, forecast.projections().size());
        assertTrue(forecast.daysOfStockRemaining() > 0);
        assertNotNull(forecast.recommendation());
    }

    @Test
    @DisplayName("evaluateSupplierPerformance generates composite score and risk tier")
    void testSupplierPerformance() {
        when(supplierRepo.findByIsActiveTrue()).thenReturn(List.of(reliance));
        MaterialBatch batch = MaterialBatch.builder()
                .batchId(100L)
                .batchNo("LOT-RIL-001")
                .supplier(reliance)
                .material(ppMaterial)
                .build();
        when(materialBatchRepo.findBySupplier_SupplierId(10L)).thenReturn(List.of(batch));

        QualityInspection inspection = QualityInspection.builder()
                .inspectionId(50L)
                .materialBatch(batch)
                .status("PASSED")
                .build();
        when(qualityInspectionRepo.findByMaterialBatch_BatchId(100L)).thenReturn(List.of(inspection));

        List<SupplierScoreResponse> scores = service.evaluateSupplierPerformance();

        assertNotNull(scores);
        assertEquals(1, scores.size());
        SupplierScoreResponse score = scores.get(0);
        assertEquals("Reliance Industries Limited", score.supplierName());
        assertTrue(score.compositeScore() >= 80.0);
        assertEquals("LOW_RISK", score.riskTier());
    }

    @Test
    @DisplayName("analyzeQcRootCauses provides telemetry anomaly correlation and mitigations")
    void testQcRootCauseDiagnostics() {
        when(qualityInspectionRepo.findAll()).thenReturn(List.of());

        List<QcRootCauseResponse> diagnostics = service.analyzeQcRootCauses(null);

        assertNotNull(diagnostics);
        assertFalse(diagnostics.isEmpty());
        QcRootCauseResponse diag = diagnostics.get(0);
        assertNotNull(diag.primaryRootCause());
        assertFalse(diag.correlationFactors().isEmpty());
        assertFalse(diag.suggestedMitigations().isEmpty());
    }
}

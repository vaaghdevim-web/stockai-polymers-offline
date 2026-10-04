package com.svp.stockai.service;

import com.svp.stockai.dto.ai.AiQueryRequest;
import com.svp.stockai.dto.ai.AiQueryResponse;
import com.svp.stockai.entity.RawMaterial;
import com.svp.stockai.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AiCopilotServiceTest {

    private RawMaterialRepository rawMaterialRepo;
    private InventoryRepository inventoryRepo;
    private SupplierRepository supplierRepo;
    private PurchaseRecommendationRepository recommendationRepo;
    private ProductionRunRepository productionRunRepo;
    private DispatchRepository dispatchRepo;
    private AiAnalyticsService aiAnalyticsService;
    private AiCopilotService service;

    @BeforeEach
    void setUp() {
        rawMaterialRepo = mock(RawMaterialRepository.class);
        inventoryRepo = mock(InventoryRepository.class);
        supplierRepo = mock(SupplierRepository.class);
        recommendationRepo = mock(PurchaseRecommendationRepository.class);
        productionRunRepo = mock(ProductionRunRepository.class);
        dispatchRepo = mock(DispatchRepository.class);
        aiAnalyticsService = mock(AiAnalyticsService.class);

        service = new AiCopilotService(
                rawMaterialRepo,
                inventoryRepo,
                supplierRepo,
                recommendationRepo,
                productionRunRepo,
                dispatchRepo,
                aiAnalyticsService
        );
    }

    @Test
    @DisplayName("processQuery handles empty query gracefully")
    void testEmptyQuery() {
        AiQueryResponse response = service.processQuery(new AiQueryRequest("", null, null));
        assertEquals("EMPTY_QUERY", response.intent());
        assertFalse(response.suggestedActions().isEmpty());
    }

    @Test
    @DisplayName("processQuery routes inventory intent correctly")
    void testInventoryIntent() {
        RawMaterial rm = RawMaterial.builder()
                .materialId(1L)
                .materialCode("RM-PP-01")
                .materialName("PP Granules")
                .reorderLevel(BigDecimal.valueOf(5000))
                .build();
        when(rawMaterialRepo.findAll()).thenReturn(List.of(rm));
        when(inventoryRepo.getTotalAvailableRawMaterial(1L)).thenReturn(BigDecimal.valueOf(20000));

        AiQueryResponse response = service.processQuery(new AiQueryRequest("What is our PP stock level?", null, null));

        assertEquals("INVENTORY_LOOKUP", response.intent());
        assertNotNull(response.answer());
        assertEquals(1, response.structuredData().size());
    }

    @Test
    @DisplayName("processQuery routes forecast intent correctly")
    void testForecastIntent() {
        when(aiAnalyticsService.generateDemandForecast(null, 30)).thenReturn(List.of());

        AiQueryResponse response = service.processQuery(new AiQueryRequest("Predict consumption forecast for next 30 days", null, null));

        assertEquals("DEMAND_FORECAST", response.intent());
        assertNotNull(response.answer());
        verify(aiAnalyticsService).generateDemandForecast(null, 30);
    }

    @Test
    @DisplayName("processQuery routes supplier intent correctly")
    void testSupplierIntent() {
        when(aiAnalyticsService.evaluateSupplierPerformance()).thenReturn(List.of());

        AiQueryResponse response = service.processQuery(new AiQueryRequest("Show top supplier vendor ranking", null, null));

        assertEquals("SUPPLIER_RANKING", response.intent());
        verify(aiAnalyticsService).evaluateSupplierPerformance();
    }
}

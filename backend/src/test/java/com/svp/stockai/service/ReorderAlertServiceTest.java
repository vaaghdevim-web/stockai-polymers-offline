package com.svp.stockai.service;

import com.svp.stockai.dto.PurchaseRecommendationResponse;
import com.svp.stockai.dto.ReorderCheckSummaryResponse;
import com.svp.stockai.entity.AppUser;
import com.svp.stockai.entity.Plant;
import com.svp.stockai.entity.PurchaseRecommendation;
import com.svp.stockai.entity.RawMaterial;
import com.svp.stockai.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ReorderAlertServiceTest {

    private RawMaterialRepository rawMaterialRepo;
    private InventoryRepository inventoryRepo;
    private PurchaseRecommendationRepository recommendationRepo;
    private PlantRepository plantRepo;
    private AppUserRepository userRepo;
    private AsyncAlertWorker alertWorker;
    private ReorderAlertService service;

    private Plant plant;
    private RawMaterial ppResin;
    private RawMaterial calciumCarbonate;

    @BeforeEach
    void setUp() {
        rawMaterialRepo = mock(RawMaterialRepository.class);
        inventoryRepo = mock(InventoryRepository.class);
        recommendationRepo = mock(PurchaseRecommendationRepository.class);
        plantRepo = mock(PlantRepository.class);
        userRepo = mock(AppUserRepository.class);
        alertWorker = mock(AsyncAlertWorker.class);

        service = new ReorderAlertService(
                rawMaterialRepo,
                inventoryRepo,
                recommendationRepo,
                plantRepo,
                userRepo
        );

        org.springframework.test.util.ReflectionTestUtils.setField(service, "asyncAlertWorker", alertWorker);

        plant = Plant.builder().plantId(1L).plantName("SVP Unit 1 Compounding Plant").build();
        when(plantRepo.findByIsActiveTrue()).thenReturn(List.of(plant));

        ppResin = RawMaterial.builder()
                .materialId(101L)
                .materialCode("RM-PP-RAFFIA")
                .materialName("PP Raffia Granules")
                .standardCost(new BigDecimal("95.0000"))
                .reorderLevel(new BigDecimal("1000.0000"))
                .safetyStock(new BigDecimal("500.0000"))
                .leadTimeDays(5)
                .isActive(true)
                .build();

        calciumCarbonate = RawMaterial.builder()
                .materialId(102L)
                .materialCode("RM-CACO3")
                .materialName("Calcium Carbonate Filler")
                .standardCost(new BigDecimal("28.0000"))
                .reorderLevel(new BigDecimal("2000.0000"))
                .safetyStock(new BigDecimal("800.0000"))
                .leadTimeDays(3)
                .isActive(true)
                .build();
    }

    @Test
    @DisplayName("Reorder Alert - Generates Critical recommendation when stock falls below safety stock")
    void checkReorderLevels_GeneratesCriticalAlert_WhenBelowSafetyStock() {
        when(rawMaterialRepo.findByIsActiveTrue()).thenReturn(List.of(ppResin));
        // Current stock = 300 KG (below safety stock 500 KG and reorder 1000 KG)
        when(inventoryRepo.getTotalAvailableRawMaterial(101L)).thenReturn(new BigDecimal("300.0000"));
        when(recommendationRepo.findByMaterial_MaterialIdAndStatusIn(eq(101L), any())).thenReturn(List.of());
        when(recommendationRepo.save(any(PurchaseRecommendation.class))).thenAnswer(inv -> {
            PurchaseRecommendation pr = inv.getArgument(0);
            pr.setRecommendationId(1L);
            return pr;
        });

        ReorderCheckSummaryResponse summary = service.checkReorderLevels();

        assertNotNull(summary);
        assertEquals(1, summary.getTotalMaterialsEvaluated());
        assertEquals(1, summary.getLowStockCount());
        assertEquals(1, summary.getCriticalStockCount());
        assertEquals(1, summary.getNewRecommendationsCreated());
        assertEquals("Critical", summary.getGeneratedRecommendations().get(0).getPriority());

        verify(recommendationRepo).save(any(PurchaseRecommendation.class));
        verify(alertWorker, times(1)).processAlert(any());
    }

    @Test
    @DisplayName("Reorder Alert - Generates Medium recommendation when stock is between safety and reorder level")
    void checkReorderLevels_GeneratesMediumAlert_WhenBelowReorderLevel() {
        when(rawMaterialRepo.findByIsActiveTrue()).thenReturn(List.of(calciumCarbonate));
        // Current stock = 1200 KG (above safety stock 800 KG, but below reorder 2000 KG)
        when(inventoryRepo.getTotalAvailableRawMaterial(102L)).thenReturn(new BigDecimal("1200.0000"));
        when(recommendationRepo.findByMaterial_MaterialIdAndStatusIn(eq(102L), any())).thenReturn(List.of());
        when(recommendationRepo.save(any(PurchaseRecommendation.class))).thenAnswer(inv -> {
            PurchaseRecommendation pr = inv.getArgument(0);
            pr.setRecommendationId(2L);
            return pr;
        });

        ReorderCheckSummaryResponse summary = service.checkReorderLevels();

        assertNotNull(summary);
        assertEquals(1, summary.getLowStockCount());
        assertEquals(0, summary.getCriticalStockCount());
        assertEquals(1, summary.getNewRecommendationsCreated());
        assertEquals("Medium", summary.getGeneratedRecommendations().get(0).getPriority());

        verify(recommendationRepo).save(any(PurchaseRecommendation.class));
        verify(alertWorker, times(1)).processAlert(any());
    }

    @Test
    @DisplayName("Reorder Alert - Skips evaluation when stock is above reorder level")
    void checkReorderLevels_SkipsWhenStockSufficient() {
        when(rawMaterialRepo.findByIsActiveTrue()).thenReturn(List.of(ppResin));
        // Current stock = 5000 KG (well above reorder level 1000 KG)
        when(inventoryRepo.getTotalAvailableRawMaterial(101L)).thenReturn(new BigDecimal("5000.0000"));

        ReorderCheckSummaryResponse summary = service.checkReorderLevels();

        assertNotNull(summary);
        assertEquals(1, summary.getTotalMaterialsEvaluated());
        assertEquals(0, summary.getLowStockCount());
        assertEquals(0, summary.getNewRecommendationsCreated());

        verifyNoInteractions(recommendationRepo);
        verifyNoInteractions(alertWorker);
    }

    @Test
    @DisplayName("Purchase Recommendation - Approve recommendation sets status and approver")
    void approveRecommendation_Success() {
        PurchaseRecommendation rec = PurchaseRecommendation.builder()
                .recommendationId(10L)
                .material(ppResin)
                .status("New")
                .recommendedQty(new BigDecimal("1500.0000"))
                .build();

        AppUser user = AppUser.builder().userId(1L).userName("manager1").build();

        when(recommendationRepo.findById(10L)).thenReturn(Optional.of(rec));
        when(userRepo.findByUserName("manager1")).thenReturn(Optional.of(user));
        when(recommendationRepo.save(any(PurchaseRecommendation.class))).thenAnswer(inv -> inv.getArgument(0));

        PurchaseRecommendationResponse response = service.approveRecommendation(10L, "manager1");

        assertNotNull(response);
        assertEquals("Approved", response.getStatus());
        assertEquals("manager1", response.getApprovedByUserName());
        assertNotNull(response.getApprovedAt());
    }

    @Test
    @DisplayName("Purchase Recommendation - Throws Bad Request when approving already approved recommendation")
    void approveRecommendation_AlreadyApproved_ThrowsBadRequest() {
        PurchaseRecommendation rec = PurchaseRecommendation.builder()
                .recommendationId(10L)
                .status("Approved")
                .build();

        when(recommendationRepo.findById(10L)).thenReturn(Optional.of(rec));

        assertThrows(ResponseStatusException.class, () -> service.approveRecommendation(10L, "manager1"));
    }
}

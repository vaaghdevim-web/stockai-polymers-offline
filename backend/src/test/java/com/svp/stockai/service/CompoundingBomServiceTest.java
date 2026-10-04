package com.svp.stockai.service;

import com.svp.stockai.dto.BatchRequirementCalculationResponse;
import com.svp.stockai.dto.CompoundingBomItemRequest;
import com.svp.stockai.dto.CompoundingBomRequest;
import com.svp.stockai.dto.CompoundingBomResponse;
import com.svp.stockai.entity.CompoundingBom;
import com.svp.stockai.entity.CompoundingBomItem;
import com.svp.stockai.entity.MaterialCategory;
import com.svp.stockai.entity.RawMaterial;
import com.svp.stockai.repository.AppUserRepository;
import com.svp.stockai.repository.CompoundingBomItemRepository;
import com.svp.stockai.repository.CompoundingBomRepository;
import com.svp.stockai.repository.RawMaterialRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CompoundingBomServiceTest {

    private CompoundingBomRepository bomRepo;
    private CompoundingBomItemRepository itemRepo;
    private RawMaterialRepository materialRepo;
    private AppUserRepository userRepo;
    private CompoundingBomService service;

    private RawMaterial ppMaterial;
    private RawMaterial fillerMaterial;
    private RawMaterial mbMaterial;

    @BeforeEach
    void setUp() {
        bomRepo = mock(CompoundingBomRepository.class);
        itemRepo = mock(CompoundingBomItemRepository.class);
        materialRepo = mock(RawMaterialRepository.class);
        userRepo = mock(AppUserRepository.class);
        service = new CompoundingBomService(bomRepo, itemRepo, materialRepo, userRepo);

        MaterialCategory polymerCat = MaterialCategory.builder().categoryId(1L).categoryName("PP Granules / Resin").build();
        MaterialCategory fillerCat = MaterialCategory.builder().categoryId(2L).categoryName("Calcium Carbonate Filler").build();
        MaterialCategory mbCat = MaterialCategory.builder().categoryId(3L).categoryName("Color Masterbatch (MB)").build();

        ppMaterial = RawMaterial.builder().materialId(1L).materialCode("RM-PP-1030RG").materialName("Raffia 1030RG").category(polymerCat).build();
        fillerMaterial = RawMaterial.builder().materialId(2L).materialCode("RM-FL-SQ3023").materialName("Filler SQ3023").category(fillerCat).build();
        mbMaterial = RawMaterial.builder().materialId(3L).materialCode("RM-MB-KESAR-RED").materialName("Kesar Red MB").category(mbCat).build();

        when(materialRepo.findById(1L)).thenReturn(Optional.of(ppMaterial));
        when(materialRepo.findById(2L)).thenReturn(Optional.of(fillerMaterial));
        when(materialRepo.findById(3L)).thenReturn(Optional.of(mbMaterial));
    }

    @Test
    void createBom_success_whenPercentagesEqual100() {
        CompoundingBomRequest request = CompoundingBomRequest.builder()
                .bomCode("BOM-SVP-STD-01")
                .version("1.0")
                .targetBatchWeightKg(new BigDecimal("1000.0000"))
                .items(List.of(
                        new CompoundingBomItemRequest(1L, new BigDecimal("85.0000"), true),
                        new CompoundingBomItemRequest(2L, new BigDecimal("12.0000"), true),
                        new CompoundingBomItemRequest(3L, new BigDecimal("3.0000"), true)
                ))
                .build();

        when(bomRepo.findByBomCodeAndVersion("BOM-SVP-STD-01", "1.0")).thenReturn(Optional.empty());
        when(bomRepo.save(any(CompoundingBom.class))).thenAnswer(invocation -> {
            CompoundingBom saved = invocation.getArgument(0);
            saved.setCompoundingBomId(10L);
            return saved;
        });
        when(itemRepo.save(any(CompoundingBomItem.class))).thenAnswer(invocation -> {
            CompoundingBomItem item = invocation.getArgument(0);
            item.setCompoundingBomItemId(100L);
            return item;
        });

        CompoundingBomResponse response = service.createBom(request, "admin");

        assertNotNull(response);
        assertEquals(10L, response.getCompoundingBomId());
        assertEquals("BOM-SVP-STD-01", response.getBomCode());
        assertEquals("Draft", response.getStatus());
        assertEquals(3, response.getItems().size());

        // Verify target quantities calculated: 85% of 1000 = 850kg, 12% = 120kg, 3% = 30kg
        assertEquals(new BigDecimal("850.0000"), response.getItems().get(0).getTargetQuantityKg());
        assertEquals(new BigDecimal("120.0000"), response.getItems().get(1).getTargetQuantityKg());
        assertEquals(new BigDecimal("30.0000"), response.getItems().get(2).getTargetQuantityKg());
    }

    @Test
    void createBom_throwsBadRequest_whenPercentageSumIsNot100() {
        CompoundingBomRequest request = CompoundingBomRequest.builder()
                .bomCode("BOM-SVP-INVALID")
                .version("1.0")
                .targetBatchWeightKg(new BigDecimal("1000.0000"))
                .items(List.of(
                        new CompoundingBomItemRequest(1L, new BigDecimal("85.0000"), true),
                        new CompoundingBomItemRequest(2L, new BigDecimal("10.0000"), true)
                        // Sum is 95% -> INVALID!
                ))
                .build();

        when(bomRepo.findByBomCodeAndVersion("BOM-SVP-INVALID", "1.0")).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.createBom(request, "admin"));
        assertTrue(ex.getMessage().contains("Total recipe percentage must equal 100.0000%"));
    }

    @Test
    void createBom_throwsConflict_whenBomCodeAndVersionAlreadyExists() {
        CompoundingBomRequest request = CompoundingBomRequest.builder()
                .bomCode("BOM-EXISTING")
                .version("1.0")
                .targetBatchWeightKg(new BigDecimal("1000.0000"))
                .items(List.of(new CompoundingBomItemRequest(1L, new BigDecimal("100.0000"), true)))
                .build();

        when(bomRepo.findByBomCodeAndVersion("BOM-EXISTING", "1.0"))
                .thenReturn(Optional.of(CompoundingBom.builder().compoundingBomId(5L).build()));

        assertThrows(ResponseStatusException.class, () -> service.createBom(request, "admin"));
    }

    @Test
    void activateBom_success() {
        CompoundingBom bom = CompoundingBom.builder()
                .compoundingBomId(10L)
                .bomCode("BOM-01")
                .version("1.0")
                .status("Draft")
                .targetBatchWeightKg(new BigDecimal("1000.0000"))
                .build();

        CompoundingBomItem item = CompoundingBomItem.builder()
                .compoundingBomItemId(1L)
                .compoundingBom(bom)
                .material(ppMaterial)
                .percentage(new BigDecimal("100.0000"))
                .targetQuantityKg(new BigDecimal("1000.0000"))
                .build();

        when(bomRepo.findById(10L)).thenReturn(Optional.of(bom));
        when(itemRepo.findByCompoundingBom_CompoundingBomId(10L)).thenReturn(List.of(item));
        when(bomRepo.save(any(CompoundingBom.class))).thenAnswer(i -> i.getArgument(0));

        CompoundingBomResponse response = service.activateBom(10L);

        assertEquals("Active", response.getStatus());
    }

    @Test
    void calculateBatchRequirements_computesProportionalWeightsCorrectly() {
        CompoundingBom bom = CompoundingBom.builder()
                .compoundingBomId(10L)
                .bomCode("BOM-01")
                .version("1.0")
                .targetBatchWeightKg(new BigDecimal("1000.0000"))
                .build();

        CompoundingBomItem item1 = CompoundingBomItem.builder()
                .compoundingBom(bom)
                .material(ppMaterial)
                .percentage(new BigDecimal("85.0000"))
                .isRequired(true)
                .build();

        CompoundingBomItem item2 = CompoundingBomItem.builder()
                .compoundingBom(bom)
                .material(fillerMaterial)
                .percentage(new BigDecimal("15.0000"))
                .isRequired(true)
                .build();

        when(bomRepo.findById(10L)).thenReturn(Optional.of(bom));
        when(itemRepo.findByCompoundingBom_CompoundingBomId(10L)).thenReturn(List.of(item1, item2));

        // Test scaling down to 500 KG batch
        BatchRequirementCalculationResponse calc500 = service.calculateBatchRequirements(10L, new BigDecimal("500.0000"));
        assertEquals(new BigDecimal("500.0000"), calc500.getDesiredBatchWeightKg());
        assertEquals(new BigDecimal("425.0000"), calc500.getCalculatedRequirements().get(0).getRequiredQuantityKg()); // 85% of 500
        assertEquals(new BigDecimal("75.0000"), calc500.getCalculatedRequirements().get(1).getRequiredQuantityKg());  // 15% of 500

        // Test scaling up to 1200 KG batch
        BatchRequirementCalculationResponse calc1200 = service.calculateBatchRequirements(10L, new BigDecimal("1200.0000"));
        assertEquals(new BigDecimal("1020.0000"), calc1200.getCalculatedRequirements().get(0).getRequiredQuantityKg()); // 85% of 1200
        assertEquals(new BigDecimal("180.0000"), calc1200.getCalculatedRequirements().get(1).getRequiredQuantityKg());  // 15% of 1200
    }
}

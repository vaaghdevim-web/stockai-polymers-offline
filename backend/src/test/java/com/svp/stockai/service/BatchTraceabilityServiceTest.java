package com.svp.stockai.service;

import com.svp.stockai.dto.traceability.BatchTraceabilityResponse;
import com.svp.stockai.entity.*;
import com.svp.stockai.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class BatchTraceabilityServiceTest {

    private FinishedBatchRepository finishedBatchRepo;
    private MaterialBatchRepository materialBatchRepo;
    private BatchGenealogyRepository batchGenealogyRepo;
    private CompoundingBatchMaterialRepository compoundingBatchMaterialRepo;
    private QualityInspectionRepository qualityInspectionRepo;
    private PalletItemRepository palletItemRepo;
    private DispatchItemRepository dispatchItemRepo;

    private BatchTraceabilityService service;

    private FinishedBatch finishedBatch;
    private MaterialBatch rawBatch;
    private CompoundingBatch compoundingBatch;
    private ProductionRun productionRun;

    @BeforeEach
    void setUp() {
        finishedBatchRepo = mock(FinishedBatchRepository.class);
        materialBatchRepo = mock(MaterialBatchRepository.class);
        batchGenealogyRepo = mock(BatchGenealogyRepository.class);
        compoundingBatchMaterialRepo = mock(CompoundingBatchMaterialRepository.class);
        qualityInspectionRepo = mock(QualityInspectionRepository.class);
        palletItemRepo = mock(PalletItemRepository.class);
        dispatchItemRepo = mock(DispatchItemRepository.class);

        service = new BatchTraceabilityService(
                finishedBatchRepo,
                materialBatchRepo,
                batchGenealogyRepo,
                compoundingBatchMaterialRepo,
                qualityInspectionRepo,
                palletItemRepo,
                dispatchItemRepo
        );

        FinishedProduct product = FinishedProduct.builder()
                .productId(1L)
                .productName("50kg PP Woven Bag (Laminated)")
                .productCode("FP-BAG-50KG")
                .build();

        finishedBatch = FinishedBatch.builder()
                .finishedBatchId(10L)
                .batchNo("FB-2026-001")
                .product(product)
                .productionDate(LocalDate.now())
                .qtyProduced(BigDecimal.valueOf(10000))
                .qualityStatus("Released")
                .build();

        Supplier reliance = Supplier.builder()
                .supplierId(100L)
                .supplierName("Reliance Industries Limited")
                .build();

        RawMaterial ppResin = RawMaterial.builder()
                .materialId(5L)
                .materialName("PP Homopolymer H030SG")
                .materialCode("RM-PP-01")
                .build();

        rawBatch = MaterialBatch.builder()
                .batchId(50L)
                .batchNo("BATCH-RM-001")
                .lotNumber("LOT-RIL-99")
                .material(ppResin)
                .supplier(reliance)
                .receivedAt(OffsetDateTime.now())
                .currentWeightKg(BigDecimal.valueOf(25000))
                .qualityStatus("Available")
                .build();

        compoundingBatch = CompoundingBatch.builder()
                .compoundingBatchId(20L)
                .batchCode("CB-2026-005")
                .targetWeightKg(BigDecimal.valueOf(5000))
                .actualWeightKg(BigDecimal.valueOf(5000))
                .status("COMPLETED")
                .build();

        productionRun = ProductionRun.builder()
                .productionId(30L)
                .productionNumber("PR-2026-012")
                .status("Completed")
                .build();
    }

    @Test
    @DisplayName("getBackwardTraceability builds complete tree from finished goods to raw materials")
    void testBackwardTraceability() {
        when(finishedBatchRepo.findByBatchNo("FB-2026-001")).thenReturn(Optional.of(finishedBatch));

        BatchGenealogy bg = BatchGenealogy.builder()
                .genealogyId(1L)
                .finishedBatch(finishedBatch)
                .compoundingBatch(compoundingBatch)
                .rawMaterialBatch(rawBatch)
                .productionRun(productionRun)
                .quantityConsumed(BigDecimal.valueOf(4250))
                .build();

        when(batchGenealogyRepo.findByFinishedBatch_FinishedBatchId(10L)).thenReturn(List.of(bg));
        when(qualityInspectionRepo.findByFinishedBatch_FinishedBatchId(10L)).thenReturn(List.of());
        when(palletItemRepo.findByFinishedBatch_FinishedBatchId(10L)).thenReturn(List.of());
        when(dispatchItemRepo.findByFinishedBatch_FinishedBatchId(10L)).thenReturn(List.of());

        BatchTraceabilityResponse response = service.getBackwardTraceability("FB-2026-001");

        assertTrue(response.found());
        assertEquals("BACKWARD", response.traceabilityDirection());
        assertEquals("FINISHED_PRODUCT", response.itemType());
        assertNotNull(response.rootNode());
        assertEquals("FB-2026-001", response.rootNode().identifier());
        assertFalse(response.rootNode().children().isEmpty());
    }

    @Test
    @DisplayName("getForwardTraceability builds complete forward lineage from supplier lot")
    void testForwardTraceability() {
        when(materialBatchRepo.findByLotNumber("LOT-RIL-99")).thenReturn(Optional.of(rawBatch));
        when(batchGenealogyRepo.findByRawMaterialBatch_BatchId(50L)).thenReturn(List.of());
        when(compoundingBatchMaterialRepo.findByMaterialBatch_BatchId(50L)).thenReturn(List.of());
        when(qualityInspectionRepo.findByMaterialBatch_BatchId(50L)).thenReturn(List.of());

        BatchTraceabilityResponse response = service.getForwardTraceability("LOT-RIL-99");

        assertTrue(response.found());
        assertEquals("FORWARD", response.traceabilityDirection());
        assertEquals("RAW_MATERIAL", response.itemType());
        assertNotNull(response.rootNode());
        assertEquals("LOT-RIL-99", response.rootNode().identifier());
    }

    @Test
    @DisplayName("getGenealogy resolves automatic identification for batches")
    void testUniversalGenealogy() {
        when(finishedBatchRepo.findByBatchNo("FB-2026-001")).thenReturn(Optional.of(finishedBatch));
        when(batchGenealogyRepo.findByFinishedBatch_FinishedBatchId(10L)).thenReturn(List.of());

        BatchTraceabilityResponse response = service.getGenealogy("FB-2026-001");

        assertTrue(response.found());
        assertEquals("BACKWARD", response.traceabilityDirection());
    }
}

package com.svp.stockai.stress;

import com.svp.stockai.entity.*;
import com.svp.stockai.repository.MaterialBatchRepository;
import com.svp.stockai.repository.RawMaterialRepository;
import com.svp.stockai.repository.SupplierRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("Transaction Isolation & Atomic Rollback Stress Tests")
class TransactionIsolationRollbackStressTest {

    @Autowired
    private MaterialBatchRepository materialBatchRepository;

    @Autowired
    private RawMaterialRepository rawMaterialRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private Long testBatchId;
    private final BigDecimal initialWeight = new BigDecimal("1000.0000");

    @BeforeEach
    void setUp() {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        tx.execute(status -> {
            MaterialCategory category = MaterialCategory.builder()
                    .categoryName("Polymer Resin " + System.nanoTime())
                    .categoryType("Raw")
                    .isActive(true)
                    .build();
            entityManager.persist(category);

            UnitOfMeasure uom = UnitOfMeasure.builder()
                    .uomCode("KG-" + System.nanoTime())
                    .uomType("Weight")
                    .build();
            entityManager.persist(uom);

            Supplier supplier = supplierRepository.save(Supplier.builder()
                    .supplierName("IOCL Petrochemicals " + System.nanoTime())
                    .gstNo("GST-ROLLBACK-" + System.nanoTime())
                    .isActive(true)
                    .build());

            RawMaterial material = rawMaterialRepository.save(RawMaterial.builder()
                    .category(category)
                    .defaultUom(uom)
                    .materialCode("RM-PP-RB-" + System.nanoTime())
                    .materialName("PP Raffia 1110MAS")
                    .standardCost(BigDecimal.valueOf(115))
                    .reorderLevel(BigDecimal.valueOf(1000))
                    .safetyStock(BigDecimal.valueOf(500))
                    .isActive(true)
                    .build());

            MaterialBatch batch = materialBatchRepository.save(MaterialBatch.builder()
                    .batchNo("BATCH-RB-" + System.nanoTime())
                    .lotNumber("LOT-RB-" + System.nanoTime())
                    .material(material)
                    .supplier(supplier)
                    .initialWeightKg(initialWeight)
                    .currentWeightKg(initialWeight)
                    .receivedAt(OffsetDateTime.now())
                    .qualityStatus("Available")
                    .status("Available")
                    .build());

            testBatchId = batch.getBatchId();
            return null;
        });
    }

    @Test
    @DisplayName("Simulated runtime failure mid-transaction must trigger complete atomic rollback with zero balance change")
    void testAtomicRollback_OnFailure() {
        TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);

        assertThrows(RuntimeException.class, () -> {
            txTemplate.execute(status -> {
                MaterialBatch batch = materialBatchRepository.findById(testBatchId).orElseThrow();
                batch.setCurrentWeightKg(batch.getCurrentWeightKg().subtract(new BigDecimal("250.0000")));
                materialBatchRepository.save(batch);

                // Simulate unexpected downstream network/database failure
                throw new RuntimeException("Simulated unexpected downstream error during compounding step");
            });
        });

        // Verify balance was NOT mutated
        MaterialBatch afterRollback = materialBatchRepository.findById(testBatchId).orElseThrow();
        assertEquals(0, initialWeight.compareTo(afterRollback.getCurrentWeightKg()),
                "Stock balance must remain exactly at initial 1000.0000 kg following atomic rollback");
    }
}

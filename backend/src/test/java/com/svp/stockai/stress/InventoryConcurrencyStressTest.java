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
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("Inventory Concurrency & Pessimistic Locking Stress Tests")
class InventoryConcurrencyStressTest {

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
                    .supplierName("Reliance Petrochemicals " + System.nanoTime())
                    .gstNo("GST-STRESS-" + System.nanoTime())
                    .isActive(true)
                    .build());

            RawMaterial material = rawMaterialRepository.save(RawMaterial.builder()
                    .category(category)
                    .defaultUom(uom)
                    .materialCode("RM-PP-STRESS-" + System.nanoTime())
                    .materialName("PP Raffia 1030RG")
                    .standardCost(BigDecimal.valueOf(110))
                    .reorderLevel(BigDecimal.valueOf(1000))
                    .safetyStock(BigDecimal.valueOf(500))
                    .isActive(true)
                    .build());

            // Initial stock: 500.00 kg
            MaterialBatch batch = materialBatchRepository.save(MaterialBatch.builder()
                    .batchNo("BATCH-STRESS-" + System.nanoTime())
                    .lotNumber("LOT-STRESS-" + System.nanoTime())
                    .material(material)
                    .supplier(supplier)
                    .initialWeightKg(new BigDecimal("500.0000"))
                    .currentWeightKg(new BigDecimal("500.0000"))
                    .receivedAt(OffsetDateTime.now())
                    .qualityStatus("Available")
                    .status("Available")
                    .build());

            testBatchId = batch.getBatchId();
            return null;
        });
    }

    @Test
    @DisplayName("20 concurrent threads attempting 50kg draws against 500kg lot: exactly 10 succeed and 0 over-allocation")
    void testConcurrentInventoryDraw_PessimisticLockProtection() throws InterruptedException {
        int numberOfThreads = 20;
        BigDecimal drawAmount = new BigDecimal("50.0000");

        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(numberOfThreads);

        AtomicInteger successfulDraws = new AtomicInteger(0);
        AtomicInteger failedDraws = new AtomicInteger(0);

        TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);

        for (int i = 0; i < numberOfThreads; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await(); // Synchronize all threads to hit simultaneously

                    txTemplate.execute(status -> {
                        MaterialBatch batch = materialBatchRepository.findByIdWithLock(testBatchId)
                                .orElseThrow(() -> new IllegalStateException("Batch not found"));

                        if (batch.getCurrentWeightKg().compareTo(drawAmount) >= 0) {
                            batch.setCurrentWeightKg(batch.getCurrentWeightKg().subtract(drawAmount));
                            materialBatchRepository.save(batch);
                            successfulDraws.incrementAndGet();
                        } else {
                            failedDraws.incrementAndGet();
                        }
                        return null;
                    });
                } catch (Exception e) {
                    failedDraws.incrementAndGet();
                } finally {
                    finishLatch.countDown();
                }
            });
        }

        // Fire all threads simultaneously
        startLatch.countDown();
        boolean completed = finishLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(completed, "All concurrent transactions should complete within timeout");
        assertEquals(10, successfulDraws.get(), "Exactly 10 threads should succeed (10 * 50kg = 500kg)");
        assertEquals(10, failedDraws.get(), "Remaining 10 threads should be rejected due to zero remaining stock");

        // Verify database final state
        MaterialBatch finalBatch = materialBatchRepository.findById(testBatchId).orElseThrow();
        assertEquals(0, new BigDecimal("0.0000").compareTo(finalBatch.getCurrentWeightKg()),
                "Final batch currentWeightKg must be exactly 0.0000 kg with zero negative balance");
    }
}

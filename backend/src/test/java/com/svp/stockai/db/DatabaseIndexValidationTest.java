package com.svp.stockai.db;

import com.svp.stockai.entity.*;
import com.svp.stockai.repository.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
@DisplayName("Database Query Index & Derived Query Validation Tests")
class DatabaseIndexValidationTest {

    @Autowired
    private MaterialBatchRepository materialBatchRepository;

    @Autowired
    private RawMaterialRepository rawMaterialRepository;

    @Autowired
    private PlantRepository plantRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private CompoundingBomRepository compoundingBomRepository;

    @Autowired
    private PalletRepository palletRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private EntityManager entityManager;

    private RawMaterial testMaterial;
    private Plant testPlant;
    private Supplier testSupplier;
    private Warehouse testWarehouse;

    @BeforeEach
    void setUp() {
        testPlant = plantRepository.save(Plant.builder()
                .plantName("Index Test Plant " + System.nanoTime())
                .city("Surat")
                .state("Gujarat")
                .country("India")
                .isActive(true)
                .build());

        testSupplier = supplierRepository.save(Supplier.builder()
                .supplierName("MRPL Polypropylene " + System.nanoTime())
                .gstNo("GST-IDX-" + System.nanoTime())
                .isActive(true)
                .build());

        testWarehouse = warehouseRepository.save(Warehouse.builder()
                .warehouseName("RM Silo Warehouse " + System.nanoTime())
                .plant(testPlant)
                .type("Raw")
                .isActive(true)
                .build());

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

        testMaterial = rawMaterialRepository.save(RawMaterial.builder()
                .category(category)
                .defaultUom(uom)
                .materialCode("RM-PP-IDX-" + System.nanoTime())
                .materialName("PP Raffia MRPL 1030")
                .standardCost(BigDecimal.valueOf(110))
                .reorderLevel(BigDecimal.valueOf(1000))
                .safetyStock(BigDecimal.valueOf(500))
                .isActive(true)
                .build());
    }

    @Test
    @DisplayName("Validate FIFO Lot Query Index Path: orders batches by receivedAt ASC")
    void testFifoLotIndexQuery() {
        OffsetDateTime now = OffsetDateTime.now();

        // Save Batch 1 (Older: 2 days ago)
        MaterialBatch b1 = materialBatchRepository.save(MaterialBatch.builder()
                .batchNo("BATCH-OLD-" + System.nanoTime())
                .lotNumber("LOT-OLD-" + System.nanoTime())
                .material(testMaterial)
                .supplier(testSupplier)
                .initialWeightKg(new BigDecimal("1000.0000"))
                .currentWeightKg(new BigDecimal("1000.0000"))
                .receivedAt(now.minusDays(2))
                .qualityStatus("Available")
                .status("Available")
                .build());

        // Save Batch 2 (Newer: 1 hour ago)
        MaterialBatch b2 = materialBatchRepository.save(MaterialBatch.builder()
                .batchNo("BATCH-NEW-" + System.nanoTime())
                .lotNumber("LOT-NEW-" + System.nanoTime())
                .material(testMaterial)
                .supplier(testSupplier)
                .initialWeightKg(new BigDecimal("2000.0000"))
                .currentWeightKg(new BigDecimal("2000.0000"))
                .receivedAt(now.minusHours(1))
                .qualityStatus("Available")
                .status("Available")
                .build());

        List<MaterialBatch> fifoResults = materialBatchRepository.findAvailableBatchesFIFO(testMaterial.getMaterialId());

        assertNotNull(fifoResults);
        assertTrue(fifoResults.size() >= 2);
        assertEquals(b1.getBatchId(), fifoResults.get(0).getBatchId(), "Older batch (2 days ago) must be first in FIFO result");
        assertEquals(b2.getBatchId(), fifoResults.get(1).getBatchId(), "Newer batch must follow older batch");
    }

    @Test
    @DisplayName("Validate Compounding BOM Composite Index (bomCode, version)")
    void testBomCompositeIndexQuery() {
        String bomCode = "BOM-IDX-" + System.nanoTime();
        String version = "1.0";

        compoundingBomRepository.save(CompoundingBom.builder()
                .bomCode(bomCode)
                .version(version)
                .status("Active")
                .targetBatchWeightKg(new BigDecimal("1250.0000"))
                .effectiveFrom(LocalDate.now().minusDays(10))
                .build());

        Optional<CompoundingBom> bom = compoundingBomRepository.findByBomCodeAndVersion(bomCode, version);
        assertTrue(bom.isPresent());
        assertEquals(bomCode, bom.get().getBomCode());
        assertEquals(version, bom.get().getVersion());
    }

    @Test
    @DisplayName("Validate Pallet Unique Barcode & PalletCode Index Query")
    void testPalletBarcodeIndexQuery() {
        String palletCode = "PLT-IDX-" + System.nanoTime();
        String barcode = "BC-IDX-" + System.nanoTime();

        palletRepository.save(Pallet.builder()
                .palletCode(palletCode)
                .barcode(barcode)
                .warehouse(testWarehouse)
                .status("Open")
                .build());

        assertTrue(palletRepository.existsByBarcode(barcode));
        assertTrue(palletRepository.existsByPalletCode(palletCode));

        Optional<Pallet> byBarcode = palletRepository.findByBarcode(barcode);
        assertTrue(byBarcode.isPresent());
        assertEquals(palletCode, byBarcode.get().getPalletCode());
    }
}

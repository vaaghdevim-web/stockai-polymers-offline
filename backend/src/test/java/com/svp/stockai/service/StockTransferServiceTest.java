package com.svp.stockai.service;

import com.svp.stockai.dto.StockTransferItemRequest;
import com.svp.stockai.dto.StockTransferRequest;
import com.svp.stockai.dto.StockTransferResponse;
import com.svp.stockai.entity.*;
import com.svp.stockai.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class StockTransferServiceTest {

    private StockTransferRepository stockTransferRepo;
    private StockTransferItemRepository stockTransferItemRepo;
    private WarehouseRepository warehouseRepo;
    private LocationBinRepository locationBinRepo;
    private MaterialBatchRepository materialBatchRepo;
    private FinishedBatchRepository finishedBatchRepo;
    private InventoryRepository inventoryRepo;
    private InventoryTransactionRepository inventoryTxRepo;
    private UnitOfMeasureRepository uomRepo;
    private AppUserRepository userRepo;
    private AsyncAlertWorker alertWorker;
    private StockTransferService service;

    private Warehouse unit1Wh;
    private Warehouse unit2Wh;
    private LocationBin fromBin;
    private LocationBin toBin;
    private MaterialBatch materialBatch;

    @BeforeEach
    void setUp() {
        stockTransferRepo = mock(StockTransferRepository.class);
        stockTransferItemRepo = mock(StockTransferItemRepository.class);
        warehouseRepo = mock(WarehouseRepository.class);
        locationBinRepo = mock(LocationBinRepository.class);
        materialBatchRepo = mock(MaterialBatchRepository.class);
        finishedBatchRepo = mock(FinishedBatchRepository.class);
        inventoryRepo = mock(InventoryRepository.class);
        inventoryTxRepo = mock(InventoryTransactionRepository.class);
        uomRepo = mock(UnitOfMeasureRepository.class);
        userRepo = mock(AppUserRepository.class);
        alertWorker = mock(AsyncAlertWorker.class);

        service = new StockTransferService(
                stockTransferRepo,
                stockTransferItemRepo,
                warehouseRepo,
                locationBinRepo,
                materialBatchRepo,
                finishedBatchRepo,
                inventoryRepo,
                inventoryTxRepo,
                uomRepo,
                userRepo
        );

        org.springframework.test.util.ReflectionTestUtils.setField(service, "asyncAlertWorker", alertWorker);

        unit1Wh = Warehouse.builder().warehouseId(1L).warehouseName("Unit 1 Compounding RM Warehouse").build();
        unit2Wh = Warehouse.builder().warehouseId(2L).warehouseName("Unit 2 Weaving WIP Warehouse").build();
        fromBin = LocationBin.builder().binId(101L).binCode("U1-BIN-01").build();
        toBin = LocationBin.builder().binId(201L).binCode("U2-BIN-01").build();
        materialBatch = MaterialBatch.builder().batchId(50L).batchNo("MB-BATCH-50").unitCost(new BigDecimal("110.00")).build();

        when(warehouseRepo.findById(1L)).thenReturn(Optional.of(unit1Wh));
        when(warehouseRepo.findById(2L)).thenReturn(Optional.of(unit2Wh));
        when(locationBinRepo.findById(101L)).thenReturn(Optional.of(fromBin));
        when(locationBinRepo.findById(201L)).thenReturn(Optional.of(toBin));
        when(materialBatchRepo.findById(50L)).thenReturn(Optional.of(materialBatch));
    }

    @Test
    @DisplayName("Stock Transfer - Create transfer note in Draft state")
    void createTransfer_Success() {
        StockTransferRequest request = StockTransferRequest.builder()
                .fromWarehouseId(1L)
                .toWarehouseId(2L)
                .transferDate(LocalDate.now())
                .items(List.of(
                        StockTransferItemRequest.builder()
                                .materialBatchId(50L)
                                .fromBinId(101L)
                                .toBinId(201L)
                                .quantity(new BigDecimal("500.0000"))
                                .build()
                ))
                .build();

        when(stockTransferRepo.save(any(StockTransfer.class))).thenAnswer(inv -> {
            StockTransfer st = inv.getArgument(0);
            st.setTransferId(10L);
            return st;
        });
        when(stockTransferItemRepo.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        StockTransferResponse response = service.createTransfer(request, "supervisor");

        assertNotNull(response);
        assertEquals("Draft", response.getStatus());
        assertTrue(response.getTransferNumber().startsWith("TRF-"));
        assertEquals(1, response.getItems().size());
        verify(stockTransferRepo).save(any(StockTransfer.class));
    }

    @Test
    @DisplayName("Stock Transfer - Same warehouse transfer throws Bad Request")
    void createTransfer_SameWarehouse_ThrowsBadRequest() {
        StockTransferRequest request = StockTransferRequest.builder()
                .fromWarehouseId(1L)
                .toWarehouseId(1L)
                .items(List.of(
                        StockTransferItemRequest.builder()
                                .materialBatchId(50L)
                                .fromBinId(101L)
                                .toBinId(201L)
                                .quantity(new BigDecimal("100.0000"))
                                .build()
                ))
                .build();

        assertThrows(ResponseStatusException.class, () -> service.createTransfer(request, "operator"));
    }

    @Test
    @DisplayName("Stock Transfer - Complete transfer updates inventory and creates dual transactions")
    void completeTransfer_Success() {
        StockTransfer transfer = StockTransfer.builder()
                .transferId(10L)
                .transferNumber("TRF-20260908-ABC123")
                .fromWarehouse(unit1Wh)
                .toWarehouse(unit2Wh)
                .status("Draft")
                .build();

        StockTransferItem item = StockTransferItem.builder()
                .stiId(500L)
                .transfer(transfer)
                .materialBatch(materialBatch)
                .fromBin(fromBin)
                .toBin(toBin)
                .quantity(new BigDecimal("200.0000"))
                .build();

        Inventory sourceInv = Inventory.builder()
                .inventoryId(1001L)
                .materialBatch(materialBatch)
                .bin(fromBin)
                .quantityOnHand(new BigDecimal("1000.0000"))
                .reservedQty(BigDecimal.ZERO)
                .build();

        Inventory destInv = Inventory.builder()
                .inventoryId(1002L)
                .materialBatch(materialBatch)
                .bin(toBin)
                .quantityOnHand(new BigDecimal("50.0000"))
                .reservedQty(BigDecimal.ZERO)
                .build();

        when(stockTransferRepo.findById(10L)).thenReturn(Optional.of(transfer));
        when(stockTransferItemRepo.findByTransfer_TransferId(10L)).thenReturn(List.of(item));
        when(inventoryRepo.findByMaterialBatch_BatchIdAndBin_BinId(50L, 101L)).thenReturn(Optional.of(sourceInv));
        when(inventoryRepo.findByMaterialBatch_BatchIdAndBin_BinId(50L, 201L)).thenReturn(Optional.of(destInv));
        when(inventoryRepo.save(any(Inventory.class))).thenAnswer(inv -> inv.getArgument(0));
        when(stockTransferRepo.save(any(StockTransfer.class))).thenAnswer(inv -> inv.getArgument(0));

        StockTransferResponse response = service.completeTransfer(10L, "manager");

        assertNotNull(response);
        assertEquals("Completed", response.getStatus());
        assertEquals(new BigDecimal("800.0000"), sourceInv.getQuantityOnHand());
        assertEquals(new BigDecimal("250.0000"), destInv.getQuantityOnHand());

        // Verify dual inventory transactions (1 TransferOut and 1 TransferIn)
        verify(inventoryTxRepo, times(2)).save(any(InventoryTransaction.class));
        verify(alertWorker, times(1)).processAlert(any());
    }

    @Test
    @DisplayName("Stock Transfer - Insufficient stock in source bin throws Bad Request")
    void completeTransfer_InsufficientStock_ThrowsBadRequest() {
        StockTransfer transfer = StockTransfer.builder()
                .transferId(10L)
                .transferNumber("TRF-20260908-FAIL01")
                .fromWarehouse(unit1Wh)
                .toWarehouse(unit2Wh)
                .status("Draft")
                .build();

        StockTransferItem item = StockTransferItem.builder()
                .stiId(500L)
                .transfer(transfer)
                .materialBatch(materialBatch)
                .fromBin(fromBin)
                .toBin(toBin)
                .quantity(new BigDecimal("500.0000"))
                .build();

        Inventory sourceInv = Inventory.builder()
                .inventoryId(1001L)
                .materialBatch(materialBatch)
                .bin(fromBin)
                .quantityOnHand(new BigDecimal("100.0000")) // only 100 on hand
                .reservedQty(BigDecimal.ZERO)
                .build();

        when(stockTransferRepo.findById(10L)).thenReturn(Optional.of(transfer));
        when(stockTransferItemRepo.findByTransfer_TransferId(10L)).thenReturn(List.of(item));
        when(inventoryRepo.findByMaterialBatch_BatchIdAndBin_BinId(50L, 101L)).thenReturn(Optional.of(sourceInv));

        assertThrows(ResponseStatusException.class, () -> service.completeTransfer(10L, "operator"));
    }
}

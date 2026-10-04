package com.svp.stockai.service;

import com.svp.stockai.dto.RawMaterialReceiptRequest;
import com.svp.stockai.dto.RawMaterialReceiptResponse;
import com.svp.stockai.entity.Inventory;
import com.svp.stockai.entity.InventoryTransaction;
import com.svp.stockai.entity.LocationBin;
import com.svp.stockai.entity.MaterialBatch;
import com.svp.stockai.entity.RawMaterial;
import com.svp.stockai.repository.InventoryRepository;
import com.svp.stockai.repository.InventoryTransactionRepository;
import com.svp.stockai.repository.LocationBinRepository;
import com.svp.stockai.repository.MaterialBatchRepository;
import com.svp.stockai.repository.RawMaterialRepository;
import com.svp.stockai.repository.SupplierRepository;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RawMaterialReceiptServiceTest {

    @Test
    void receiptCreatesBatchInventoryAndAppendOnlyTransaction() {
        RawMaterialRepository materials = mock(RawMaterialRepository.class);
        SupplierRepository suppliers = mock(SupplierRepository.class);
        LocationBinRepository bins = mock(LocationBinRepository.class);
        MaterialBatchRepository batches = mock(MaterialBatchRepository.class);
        MaterialBatchService fifo = mock(MaterialBatchService.class);
        InventoryRepository inventory = mock(InventoryRepository.class);
        InventoryTransactionRepository transactions = mock(InventoryTransactionRepository.class);
        RawMaterialReceiptService service = new RawMaterialReceiptService(materials, suppliers, bins, batches, fifo, inventory, transactions);
        RawMaterial material = RawMaterial.builder().materialId(1L).build();
        when(materials.findById(1L)).thenReturn(Optional.of(material));
        when(bins.findById(2L)).thenReturn(Optional.of(LocationBin.builder().binId(2L).build()));
        when(batches.saveAndFlush(any(MaterialBatch.class))).thenAnswer(call -> {
            MaterialBatch batch = call.getArgument(0); batch.setBatchId(3L); return batch;
        });
        when(inventory.save(any(Inventory.class))).thenAnswer(call -> {
            Inventory item = call.getArgument(0); item.setInventoryId(4L); return item;
        });
        when(transactions.save(any(InventoryTransaction.class))).thenAnswer(call -> {
            InventoryTransaction item = call.getArgument(0); item.setTransactionId(5L); return item;
        });

        RawMaterialReceiptResponse response = service.receive(request());

        assertEquals(3L, response.batchId());
        assertEquals(4L, response.inventoryId());
        assertEquals(5L, response.transactionId());
        verify(transactions).save(argThat(tx -> "Purchase".equals(tx.getTransactionType())
                && "IN".equals(tx.getDirection()) && tx.getInventory().getInventoryId().equals(4L)));
    }

    @Test
    void duplicateBatchIsReportedAsConflictBeforePersistence() {
        MaterialBatchRepository batches = mock(MaterialBatchRepository.class);
        when(batches.findByBatchNo("B-001")).thenReturn(Optional.of(MaterialBatch.builder().build()));
        RawMaterialReceiptService service = serviceWith(batches);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> service.receive(request()));

        assertEquals(409, exception.getStatusCode().value());
        verify(batches, never()).saveAndFlush(any());
    }

    @Test
    void databaseDuplicateRaceIsReportedAsConflict() {
        MaterialBatchRepository batches = mock(MaterialBatchRepository.class);
        RawMaterialRepository materials = mock(RawMaterialRepository.class);
        LocationBinRepository bins = mock(LocationBinRepository.class);
        when(materials.findById(1L)).thenReturn(Optional.of(RawMaterial.builder().materialId(1L).build()));
        when(bins.findById(2L)).thenReturn(Optional.of(LocationBin.builder().binId(2L).build()));
        when(batches.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("duplicate"));
        RawMaterialReceiptService service = new RawMaterialReceiptService(materials, mock(SupplierRepository.class), bins,
                batches, mock(MaterialBatchService.class), mock(InventoryRepository.class), mock(InventoryTransactionRepository.class));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> service.receive(request()));

        assertEquals(409, exception.getStatusCode().value());
    }

    @Test
    void fifoResultsDelegateToEngineerOneService() {
        MaterialBatchService fifo = mock(MaterialBatchService.class);
        RawMaterialRepository materials = mock(RawMaterialRepository.class);
        when(materials.existsById(1L)).thenReturn(true);
        when(fifo.getAvailableBatchesFIFO(1L)).thenReturn(List.of(
                MaterialBatch.builder().batchId(10L).batchNo("OLD").currentWeightKg(BigDecimal.TEN).build(),
                MaterialBatch.builder().batchId(11L).batchNo("NEW").currentWeightKg(BigDecimal.ONE).build()));
        RawMaterialReceiptService service = new RawMaterialReceiptService(materials, mock(SupplierRepository.class),
                mock(LocationBinRepository.class), mock(MaterialBatchRepository.class), fifo,
                mock(InventoryRepository.class), mock(InventoryTransactionRepository.class));

        assertEquals(List.of("OLD", "NEW"), service.fifoBatches(1L).stream().map(item -> item.batchNo()).toList());
        verify(fifo).getAvailableBatchesFIFO(1L);
    }

    @Test
    void laterTransactionFailurePropagatesForTransactionalRollback() {
        RawMaterialRepository materials = mock(RawMaterialRepository.class);
        LocationBinRepository bins = mock(LocationBinRepository.class);
        MaterialBatchRepository batches = mock(MaterialBatchRepository.class);
        InventoryRepository inventory = mock(InventoryRepository.class);
        InventoryTransactionRepository transactions = mock(InventoryTransactionRepository.class);
        when(materials.findById(1L)).thenReturn(Optional.of(RawMaterial.builder().materialId(1L).build()));
        when(bins.findById(2L)).thenReturn(Optional.of(LocationBin.builder().binId(2L).build()));
        when(batches.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
        when(inventory.save(any())).thenAnswer(call -> call.getArgument(0));
        when(transactions.save(any())).thenThrow(new DataIntegrityViolationException("transaction failure"));
        RawMaterialReceiptService service = new RawMaterialReceiptService(materials, mock(SupplierRepository.class), bins,
                batches, mock(MaterialBatchService.class), inventory, transactions);

        assertThrows(DataIntegrityViolationException.class, () -> service.receive(request()));
        verify(transactions).save(any(InventoryTransaction.class));
    }

    private RawMaterialReceiptService serviceWith(MaterialBatchRepository batches) {
        return new RawMaterialReceiptService(mock(RawMaterialRepository.class), mock(SupplierRepository.class),
                mock(LocationBinRepository.class), batches, mock(MaterialBatchService.class), mock(InventoryRepository.class),
                mock(InventoryTransactionRepository.class));
    }

    private RawMaterialReceiptRequest request() {
        return new RawMaterialReceiptRequest(1L, null, 2L, "B-001", "LOT-001", null,
                new BigDecimal("25.0000"), new BigDecimal("100.0000"), null, "Available");
    }
}

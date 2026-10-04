package com.svp.stockai.service;

import com.svp.stockai.dto.MaterialBatchResponse;
import com.svp.stockai.dto.RawMaterialReceiptRequest;
import com.svp.stockai.dto.RawMaterialReceiptResponse;
import com.svp.stockai.entity.Inventory;
import com.svp.stockai.entity.InventoryTransaction;
import com.svp.stockai.entity.MaterialBatch;
import com.svp.stockai.entity.Supplier;
import com.svp.stockai.repository.InventoryRepository;
import com.svp.stockai.repository.InventoryTransactionRepository;
import com.svp.stockai.repository.LocationBinRepository;
import com.svp.stockai.repository.MaterialBatchRepository;
import com.svp.stockai.repository.RawMaterialRepository;
import com.svp.stockai.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class RawMaterialReceiptService {

    private static final Set<String> RECEIVABLE_QUALITY_STATUSES = Set.of("Available", "Hold", "Quarantine");

    private final RawMaterialRepository rawMaterialRepository;
    private final SupplierRepository supplierRepository;
    private final LocationBinRepository locationBinRepository;
    private final MaterialBatchRepository materialBatchRepository;
    private final MaterialBatchService materialBatchService;
    private final InventoryRepository inventoryRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;

    @Transactional
    public RawMaterialReceiptResponse receive(RawMaterialReceiptRequest request) {
        String qualityStatus = request.qualityStatus() == null ? "Available" : request.qualityStatus();
        if (!RECEIVABLE_QUALITY_STATUSES.contains(qualityStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "qualityStatus must be Available, Hold, or Quarantine");
        }
        if (materialBatchRepository.findByBatchNo(request.batchNo()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Batch number already exists");
        }
        if (request.lotNumber() != null && materialBatchRepository.findByLotNumber(request.lotNumber()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Lot number already exists");
        }

        Supplier supplier = request.supplierId() == null ? null : supplierRepository.findById(request.supplierId())
                .orElseThrow(() -> notFound("Supplier", request.supplierId()));
        OffsetDateTime receivedAt = request.receivedAt() == null ? OffsetDateTime.now() : request.receivedAt();
        MaterialBatch batch;
        try {
            batch = materialBatchRepository.saveAndFlush(MaterialBatch.builder()
                    .material(rawMaterialRepository.findById(request.materialId())
                            .orElseThrow(() -> notFound("Raw material", request.materialId())))
                    .supplier(supplier).batchNo(request.batchNo()).lotNumber(request.lotNumber())
                    .expiryDate(request.expiryDate()).initialWeightKg(request.quantityKg())
                    .currentWeightKg(request.quantityKg()).unitCost(request.unitCost()).receivedAt(receivedAt)
                    .qualityStatus(qualityStatus).status(qualityStatus).build());
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Batch number or lot number already exists", exception);
        }

        Inventory inventory = inventoryRepository.save(Inventory.builder().materialBatch(batch)
                .bin(locationBinRepository.findById(request.binId())
                        .orElseThrow(() -> notFound("Location bin", request.binId())))
                .quantityOnHand(request.quantityKg()).qualityStatus(qualityStatus).build());
        InventoryTransaction transaction = inventoryTransactionRepository.save(InventoryTransaction.builder()
                .inventory(inventory).transactionType("Purchase").referenceType("Other")
                .referenceId(batch.getBatchNo()).quantity(request.quantityKg()).direction("IN")
                .unitCost(request.unitCost()).transactionDate(receivedAt).build());
        return new RawMaterialReceiptResponse(batch.getBatchId(), inventory.getInventoryId(), transaction.getTransactionId(),
                batch.getBatchNo(), request.quantityKg(), receivedAt, qualityStatus);
    }

    @Transactional(readOnly = true)
    public List<MaterialBatchResponse> fifoBatches(Long materialId) {
        if (!rawMaterialRepository.existsById(materialId)) {
            throw notFound("Raw material", materialId);
        }
        return materialBatchService.getAvailableBatchesFIFO(materialId).stream()
                .map(batch -> new MaterialBatchResponse(batch.getBatchId(), batch.getBatchNo(), batch.getLotNumber(),
                        batch.getCurrentWeightKg(), batch.getReceivedAt())).toList();
    }

    private ResponseStatusException notFound(String type, Long id) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, type + " " + id + " was not found");
    }
}

package com.svp.stockai.service;

import com.svp.stockai.dto.MaterialBatchResponse;
import com.svp.stockai.dto.RawMaterialReceiptRequest;
import com.svp.stockai.dto.RawMaterialReceiptResponse;
import com.svp.stockai.entity.Inventory;
import com.svp.stockai.entity.InventoryTransaction;
import com.svp.stockai.entity.LocationBin;
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
        if (request.quantityKg() == null || request.quantityKg().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be greater than zero");
        }
        if (request.unitCost() == null || request.unitCost().compareTo(java.math.BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unit cost cannot be negative");
        }
        if (request.binId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Storage bin location is required");
        }
        if (request.batchNo() == null || request.batchNo().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Batch number is required");
        }

        String qualityStatus = request.qualityStatus() == null ? "Available" : request.qualityStatus();
        if (!RECEIVABLE_QUALITY_STATUSES.contains(qualityStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "qualityStatus must be Available, Hold, or Quarantine");
        }
        if (materialBatchRepository.findByBatchNo(request.batchNo().trim()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Batch number already exists: " + request.batchNo());
        }
        if (request.lotNumber() != null && !request.lotNumber().isBlank() &&
                materialBatchRepository.findByLotNumber(request.lotNumber().trim()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Lot number already exists: " + request.lotNumber());
        }

        // Lock target bin to prevent concurrent intake race conditions
        LocationBin bin = locationBinRepository.findByIdWithLock(request.binId())
                .orElseThrow(() -> notFound("Location bin", request.binId()));

        if (Boolean.FALSE.equals(bin.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Target storage bin '" + bin.getBinCode() + "' is inactive");
        }
        if (bin.getShelf() == null || Boolean.FALSE.equals(bin.getShelf().getIsActive())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent shelf for bin '" + bin.getBinCode() + "' is inactive or missing");
        }
        if (bin.getShelf().getRack() == null || Boolean.FALSE.equals(bin.getShelf().getRack().getIsActive())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent rack for bin '" + bin.getBinCode() + "' is inactive or missing");
        }
        if (bin.getShelf().getRack().getWarehouse() == null || Boolean.FALSE.equals(bin.getShelf().getRack().getWarehouse().getIsActive())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Target warehouse is inactive or missing");
        }

        // Strict transactional capacity calculation
        java.math.BigDecimal currentOccupancy = inventoryRepository.getTotalStockInBin(bin.getBinId());
        java.math.BigDecimal binCapacity = bin.getCapacityKg() != null ? bin.getCapacityKg() : new java.math.BigDecimal("5000.0000");
        java.math.BigDecimal availableCapacity = binCapacity.subtract(currentOccupancy);

        if (request.quantityKg().compareTo(availableCapacity) > 0) {
            if (availableCapacity.compareTo(java.math.BigDecimal.ZERO) <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        String.format("Bin capacity exceeded. Bin '%s' is full (Capacity: %s KG, Stored: %s KG, Available: 0 KG). Requested quantity: %s KG.",
                                bin.getBinCode(), binCapacity, currentOccupancy, request.quantityKg()));
            } else {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        String.format("Bin capacity exceeded for bin '%s'. Available capacity = %s KG, Requested quantity = %s KG.",
                                bin.getBinCode(), availableCapacity, request.quantityKg()));
            }
        }

        Supplier supplier = request.supplierId() == null ? null : supplierRepository.findById(request.supplierId())
                .orElseThrow(() -> notFound("Supplier", request.supplierId()));
        OffsetDateTime receivedAt = request.receivedAt() == null ? OffsetDateTime.now() : request.receivedAt();

        MaterialBatch batch;
        try {
            batch = materialBatchRepository.saveAndFlush(MaterialBatch.builder()
                    .material(rawMaterialRepository.findById(request.materialId())
                            .orElseThrow(() -> notFound("Raw material", request.materialId())))
                    .supplier(supplier)
                    .batchNo(request.batchNo().trim())
                    .lotNumber(request.lotNumber() != null && !request.lotNumber().isBlank() ? request.lotNumber().trim() : null)
                    .expiryDate(request.expiryDate())
                    .initialWeightKg(request.quantityKg())
                    .currentWeightKg(request.quantityKg())
                    .unitCost(request.unitCost())
                    .receivedAt(receivedAt)
                    .qualityStatus(qualityStatus)
                    .status(qualityStatus)
                    .isActive(true)
                    .build());
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Batch number or lot number already exists", exception);
        }

        Inventory inventory = inventoryRepository.save(Inventory.builder()
                .materialBatch(batch)
                .bin(bin)
                .quantityOnHand(request.quantityKg())
                .reservedQty(java.math.BigDecimal.ZERO)
                .qualityStatus(qualityStatus)
                .build());

        InventoryTransaction transaction = inventoryTransactionRepository.save(InventoryTransaction.builder()
                .inventory(inventory)
                .transactionType("Purchase")
                .referenceType("Batch")
                .referenceId(batch.getBatchNo())
                .quantity(request.quantityKg())
                .direction("IN")
                .unitCost(request.unitCost())
                .transactionDate(receivedAt)
                .build());

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

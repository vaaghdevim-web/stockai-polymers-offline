package com.svp.stockai.service;

import com.svp.stockai.dto.*;
import com.svp.stockai.entity.*;
import com.svp.stockai.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockTransferService {

    private final StockTransferRepository stockTransferRepository;
    private final StockTransferItemRepository stockTransferItemRepository;
    private final WarehouseRepository warehouseRepository;
    private final LocationBinRepository locationBinRepository;
    private final MaterialBatchRepository materialBatchRepository;
    private final FinishedBatchRepository finishedBatchRepository;
    private final InventoryRepository inventoryRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final UnitOfMeasureRepository unitOfMeasureRepository;
    private final AppUserRepository appUserRepository;

    @Autowired(required = false)
    private AsyncAlertWorker asyncAlertWorker;

    @Transactional
    public StockTransferResponse createTransfer(StockTransferRequest request, String currentUsername) {
        if (request.getFromWarehouseId().equals(request.getToWarehouseId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Source warehouse and destination warehouse cannot be the same");
        }

        Warehouse fromWh = warehouseRepository.findById(request.getFromWarehouseId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Source warehouse not found with ID: " + request.getFromWarehouseId()));

        Warehouse toWh = warehouseRepository.findById(request.getToWarehouseId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Destination warehouse not found with ID: " + request.getToWarehouseId()));

        AppUser createdBy = null;
        if (currentUsername != null && !currentUsername.isBlank()) {
            createdBy = appUserRepository.findByUserName(currentUsername).orElse(null);
        }

        String transferNumber = "TRF-" + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE) +
                "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        StockTransfer transfer = StockTransfer.builder()
                .fromWarehouse(fromWh)
                .toWarehouse(toWh)
                .transferNumber(transferNumber)
                .transferDate(request.getTransferDate() != null ? request.getTransferDate() : LocalDate.now())
                .status("Draft")
                .createdBy(createdBy)
                .build();

        StockTransfer savedTransfer = stockTransferRepository.save(transfer);

        List<StockTransferItem> itemsToSave = new ArrayList<>();
        for (StockTransferItemRequest itemReq : request.getItems()) {
            if (itemReq.getMaterialBatchId() == null && itemReq.getFinishedBatchId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Each transfer item must specify either a materialBatchId or finishedBatchId");
            }

            MaterialBatch materialBatch = null;
            if (itemReq.getMaterialBatchId() != null) {
                materialBatch = materialBatchRepository.findById(itemReq.getMaterialBatchId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                "Material batch not found with ID: " + itemReq.getMaterialBatchId()));
            }

            FinishedBatch finishedBatch = null;
            if (itemReq.getFinishedBatchId() != null) {
                finishedBatch = finishedBatchRepository.findById(itemReq.getFinishedBatchId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                "Finished batch not found with ID: " + itemReq.getFinishedBatchId()));
            }

            LocationBin fromBin = locationBinRepository.findById(itemReq.getFromBinId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Source bin not found with ID: " + itemReq.getFromBinId()));

            LocationBin toBin = locationBinRepository.findById(itemReq.getToBinId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Destination bin not found with ID: " + itemReq.getToBinId()));

            UnitOfMeasure uom = null;
            if (itemReq.getUomId() != null) {
                uom = unitOfMeasureRepository.findById(itemReq.getUomId()).orElse(null);
            } else if (itemReq.getUomCode() != null) {
                uom = unitOfMeasureRepository.findByUomCode(itemReq.getUomCode()).orElse(null);
            }
            if (uom == null) {
                if (materialBatch != null && materialBatch.getMaterial() != null) {
                    uom = materialBatch.getMaterial().getDefaultUom();
                } else if (finishedBatch != null && finishedBatch.getProduct() != null) {
                    uom = finishedBatch.getProduct().getDefaultUom();
                }
            }

            StockTransferItem item = StockTransferItem.builder()
                    .transfer(savedTransfer)
                    .materialBatch(materialBatch)
                    .finishedBatch(finishedBatch)
                    .fromBin(fromBin)
                    .toBin(toBin)
                    .quantity(itemReq.getQuantity())
                    .uom(uom)
                    .build();

            itemsToSave.add(item);
        }

        List<StockTransferItem> savedItems = stockTransferItemRepository.saveAll(itemsToSave);

        if (Boolean.TRUE.equals(request.getAutoComplete())) {
            return completeTransfer(savedTransfer.getTransferId(), currentUsername);
        }

        return mapToResponse(savedTransfer, savedItems);
    }

    @Transactional
    public StockTransferResponse completeTransfer(Long transferId, String currentUsername) {
        StockTransfer transfer = stockTransferRepository.findById(transferId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Stock transfer not found with ID: " + transferId));

        if ("Completed".equalsIgnoreCase(transfer.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Stock transfer " + transfer.getTransferNumber() + " is already completed");
        }
        if ("Cancelled".equalsIgnoreCase(transfer.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cannot complete a cancelled stock transfer");
        }

        AppUser user = null;
        if (currentUsername != null && !currentUsername.isBlank()) {
            user = appUserRepository.findByUserName(currentUsername).orElse(null);
        }

        List<StockTransferItem> items = stockTransferItemRepository.findByTransfer_TransferId(transferId);
        if (items.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cannot complete transfer with no items");
        }

        for (StockTransferItem item : items) {
            BigDecimal qty = item.getQuantity();

            // 1. Check source inventory
            Inventory sourceInv;
            if (item.getMaterialBatch() != null) {
                sourceInv = inventoryRepository.findByMaterialBatch_BatchIdAndBin_BinId(
                        item.getMaterialBatch().getBatchId(), item.getFromBin().getBinId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                "No inventory found in source bin for Material Batch: " +
                                        item.getMaterialBatch().getBatchNo()));
            } else {
                sourceInv = inventoryRepository.findByFinishedBatch_FinishedBatchIdAndBin_BinId(
                        item.getFinishedBatch().getFinishedBatchId(), item.getFromBin().getBinId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                "No inventory found in source bin for Finished Batch: " +
                                        item.getFinishedBatch().getBatchNo()));
            }

            BigDecimal available = sourceInv.getQuantityOnHand().subtract(sourceInv.getReservedQty());
            if (available.compareTo(qty) < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Insufficient stock in source bin " + item.getFromBin().getBinCode() +
                                ". Available: " + available + ", Requested: " + qty);
            }

            // Decrement source inventory
            sourceInv.setQuantityOnHand(sourceInv.getQuantityOnHand().subtract(qty));
            inventoryRepository.save(sourceInv);

            // 2. Find or create destination inventory
            Inventory destInv;
            if (item.getMaterialBatch() != null) {
                destInv = inventoryRepository.findByMaterialBatch_BatchIdAndBin_BinId(
                        item.getMaterialBatch().getBatchId(), item.getToBin().getBinId())
                        .orElseGet(() -> Inventory.builder()
                                .materialBatch(item.getMaterialBatch())
                                .bin(item.getToBin())
                                .quantityOnHand(BigDecimal.ZERO)
                                .reservedQty(BigDecimal.ZERO)
                                .qualityStatus(sourceInv.getQualityStatus())
                                .build());
            } else {
                destInv = inventoryRepository.findByFinishedBatch_FinishedBatchIdAndBin_BinId(
                        item.getFinishedBatch().getFinishedBatchId(), item.getToBin().getBinId())
                        .orElseGet(() -> Inventory.builder()
                                .finishedBatch(item.getFinishedBatch())
                                .bin(item.getToBin())
                                .quantityOnHand(BigDecimal.ZERO)
                                .reservedQty(BigDecimal.ZERO)
                                .qualityStatus(sourceInv.getQualityStatus())
                                .build());
            }

            destInv.setQuantityOnHand(destInv.getQuantityOnHand().add(qty));
            Inventory savedDestInv = inventoryRepository.save(destInv);

            // 3. Record dual inventory transactions (TransferOut and TransferIn)
            InventoryTransaction txOut = InventoryTransaction.builder()
                    .inventory(sourceInv)
                    .stockTransferItem(item)
                    .transactionType("TransferOut")
                    .referenceType("Transfer")
                    .referenceId(transfer.getTransferNumber())
                    .quantity(qty)
                    .direction("OUT")
                    .unitCost(item.getMaterialBatch() != null ? item.getMaterialBatch().getUnitCost() : BigDecimal.ZERO)
                    .transactionDate(OffsetDateTime.now())
                    .createdBy(user)
                    .build();
            inventoryTransactionRepository.save(txOut);

            InventoryTransaction txIn = InventoryTransaction.builder()
                    .inventory(savedDestInv)
                    .stockTransferItem(item)
                    .transactionType("TransferIn")
                    .referenceType("Transfer")
                    .referenceId(transfer.getTransferNumber())
                    .quantity(qty)
                    .direction("IN")
                    .unitCost(item.getMaterialBatch() != null ? item.getMaterialBatch().getUnitCost() : BigDecimal.ZERO)
                    .transactionDate(OffsetDateTime.now())
                    .createdBy(user)
                    .build();
            inventoryTransactionRepository.save(txIn);
        }

        transfer.setStatus("Completed");
        StockTransfer completed = stockTransferRepository.save(transfer);

        // Notify receiving unit
        if (asyncAlertWorker != null) {
            AlertMessage alert = AlertMessage.builder()
                    .correlationId(UUID.randomUUID().toString())
                    .alertType("STOCK_TRANSFER_COMPLETED")
                    .severity(AlertSeverity.INFO)
                    .sourceType("STOCK_TRANSFER")
                    .sourceId(completed.getTransferNumber())
                    .message("Stock transfer " + completed.getTransferNumber() + " completed from " +
                            completed.getFromWarehouse().getWarehouseName() + " to " +
                            completed.getToWarehouse().getWarehouseName())
                    .timestamp(Instant.now())
                    .build();
            asyncAlertWorker.processAlert(alert);
        }

        return mapToResponse(completed, items);
    }

    @Transactional
    public StockTransferResponse cancelTransfer(Long transferId, String currentUsername) {
        StockTransfer transfer = stockTransferRepository.findById(transferId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Stock transfer not found with ID: " + transferId));

        if ("Completed".equalsIgnoreCase(transfer.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cannot cancel an already completed stock transfer");
        }
        if ("Cancelled".equalsIgnoreCase(transfer.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Stock transfer " + transfer.getTransferNumber() + " is already cancelled");
        }

        List<StockTransferItem> items = stockTransferItemRepository.findByTransfer_TransferId(transferId);
        for (StockTransferItem item : items) {
            Inventory sourceInv = null;
            if (item.getMaterialBatch() != null && item.getFromBin() != null) {
                sourceInv = inventoryRepository.findByMaterialBatch_BatchIdAndBin_BinId(
                        item.getMaterialBatch().getBatchId(), item.getFromBin().getBinId()).orElse(null);
            } else if (item.getFinishedBatch() != null && item.getFromBin() != null) {
                sourceInv = inventoryRepository.findByFinishedBatch_FinishedBatchIdAndBin_BinId(
                        item.getFinishedBatch().getFinishedBatchId(), item.getFromBin().getBinId()).orElse(null);
            }
            if (sourceInv != null && sourceInv.getReservedQty() != null && sourceInv.getReservedQty().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal releaseQty = item.getQuantity() != null ? item.getQuantity().min(sourceInv.getReservedQty()) : BigDecimal.ZERO;
                if (releaseQty.compareTo(BigDecimal.ZERO) > 0) {
                    sourceInv.setReservedQty(sourceInv.getReservedQty().subtract(releaseQty));
                    inventoryRepository.save(sourceInv);
                }
            }
        }

        transfer.setStatus("Cancelled");
        StockTransfer cancelled = stockTransferRepository.save(transfer);
        log.info("Stock transfer {} cancelled by {}", cancelled.getTransferNumber(), currentUsername);
        return mapToResponse(cancelled, items);
    }

    @Transactional(readOnly = true)
    public StockTransferResponse getTransferById(Long transferId) {
        StockTransfer transfer = stockTransferRepository.findById(transferId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Stock transfer not found with ID: " + transferId));
        List<StockTransferItem> items = stockTransferItemRepository.findByTransfer_TransferId(transferId);
        return mapToResponse(transfer, items);
    }

    @Transactional(readOnly = true)
    public List<StockTransferResponse> listTransfers(String status) {
        List<StockTransfer> list;
        if (status != null && !status.isBlank()) {
            list = stockTransferRepository.findByStatus(status);
        } else {
            list = stockTransferRepository.findAll();
        }

        return list.stream()
                .map(t -> {
                    List<StockTransferItem> items = stockTransferItemRepository.findByTransfer_TransferId(t.getTransferId());
                    return mapToResponse(t, items);
                })
                .toList();
    }

    private StockTransferResponse mapToResponse(StockTransfer t, List<StockTransferItem> items) {
        List<StockTransferItemResponse> itemResponses = items.stream()
                .map(i -> StockTransferItemResponse.builder()
                        .stiId(i.getStiId())
                        .materialBatchId(i.getMaterialBatch() != null ? i.getMaterialBatch().getBatchId() : null)
                        .materialBatchNo(i.getMaterialBatch() != null ? i.getMaterialBatch().getBatchNo() : null)
                        .finishedBatchId(i.getFinishedBatch() != null ? i.getFinishedBatch().getFinishedBatchId() : null)
                        .finishedBatchNo(i.getFinishedBatch() != null ? i.getFinishedBatch().getBatchNo() : null)
                        .fromBinId(i.getFromBin() != null ? i.getFromBin().getBinId() : null)
                        .fromBinCode(i.getFromBin() != null ? i.getFromBin().getBinCode() : null)
                        .toBinId(i.getToBin() != null ? i.getToBin().getBinId() : null)
                        .toBinCode(i.getToBin() != null ? i.getToBin().getBinCode() : null)
                        .quantity(i.getQuantity())
                        .uomId(i.getUom() != null ? i.getUom().getUomId() : null)
                        .uomCode(i.getUom() != null ? i.getUom().getUomCode() : null)
                        .build())
                .toList();

        return StockTransferResponse.builder()
                .transferId(t.getTransferId())
                .transferNumber(t.getTransferNumber())
                .fromWarehouseId(t.getFromWarehouse() != null ? t.getFromWarehouse().getWarehouseId() : null)
                .fromWarehouseName(t.getFromWarehouse() != null ? t.getFromWarehouse().getWarehouseName() : null)
                .toWarehouseId(t.getToWarehouse() != null ? t.getToWarehouse().getWarehouseId() : null)
                .toWarehouseName(t.getToWarehouse() != null ? t.getToWarehouse().getWarehouseName() : null)
                .transferDate(t.getTransferDate())
                .status(t.getStatus())
                .createdByUserName(t.getCreatedBy() != null ? t.getCreatedBy().getUserName() : null)
                .createdAt(t.getCreatedAt())
                .items(itemResponses)
                .build();
    }
}

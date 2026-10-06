package com.svp.stockai.service;

import com.svp.stockai.dto.CreatePalletRequest;
import com.svp.stockai.dto.PalletResponse;
import com.svp.stockai.entity.AppUser;
import com.svp.stockai.entity.FinishedBatch;
import com.svp.stockai.entity.LocationBin;
import com.svp.stockai.entity.Pallet;
import com.svp.stockai.entity.PalletItem;
import com.svp.stockai.entity.Warehouse;
import com.svp.stockai.repository.AppUserRepository;
import com.svp.stockai.repository.FinishedBatchRepository;
import com.svp.stockai.repository.LocationBinRepository;
import com.svp.stockai.repository.PalletItemRepository;
import com.svp.stockai.repository.PalletRepository;
import com.svp.stockai.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class PalletService {

    private final PalletRepository palletRepository;
    private final PalletItemRepository palletItemRepository;
    private final FinishedBatchRepository finishedBatchRepository;
    private final WarehouseRepository warehouseRepository;
    private final LocationBinRepository locationBinRepository;
    private final AppUserRepository appUserRepository;
    private final PalletBarcodeService palletBarcodeService;

    @Transactional
    public PalletResponse createPallet(CreatePalletRequest request) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Create pallet request cannot be null"
            );
        }

        if (request.getFinishedBatchId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Finished batch ID cannot be null"
            );
        }

        if (request.getWarehouseId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Warehouse ID cannot be null"
            );
        }

        if (request.getQuantity() == null || request.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Quantity must be greater than zero"
            );
        }

        FinishedBatch finishedBatch =
                finishedBatchRepository
                        .findById(request.getFinishedBatchId())
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Finished batch " + request.getFinishedBatchId() + " was not found"
                                ));

        Warehouse warehouse =
                warehouseRepository
                        .findById(request.getWarehouseId())
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Warehouse " + request.getWarehouseId() + " was not found"
                                ));

        LocationBin bin = null;

        if (request.getBinId() != null) {

            bin = locationBinRepository
                    .findById(request.getBinId())
                    .orElseThrow(() ->
                            new ResponseStatusException(
                                    HttpStatus.NOT_FOUND,
                                    "Bin " + request.getBinId() + " was not found"
                            ));
        }

        if (!Boolean.TRUE.equals(finishedBatch.getIsActive())) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Finished batch is inactive"
            );
        }

        if (!Boolean.TRUE.equals(warehouse.getIsActive())) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Warehouse is inactive"
            );
        }

        if (bin != null &&
                !Boolean.TRUE.equals(bin.getIsActive())) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Bin is inactive"
            );
        }

        // Validate that bin belongs to the specified warehouse if hierarchy is available
        if (bin != null && bin.getShelf() != null && bin.getShelf().getRack() != null
                && bin.getShelf().getRack().getWarehouse() != null) {
            Long binWarehouseId = bin.getShelf().getRack().getWarehouse().getWarehouseId();
            if (!warehouse.getWarehouseId().equals(binWarehouseId)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Bin does not belong to the specified warehouse"
                );
            }
        }

        AppUser createdBy = null;
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && !"anonymousUser".equals(authentication.getPrincipal()) && authentication.getName() != null) {
            createdBy = appUserRepository.findByUserName(authentication.getName()).orElse(null);
        }

        Pallet pallet = Pallet.builder()
                .palletCode(
                        palletBarcodeService.generatePalletCode()
                )
                .barcode(
                        palletBarcodeService.generateBarcode()
                )
                .warehouse(warehouse)
                .bin(bin)
                .status("Open")
                .createdBy(createdBy)
                .build();

        Pallet savedPallet =
                palletRepository.save(pallet);

        PalletItem palletItem = PalletItem.builder()
                .pallet(savedPallet)
                .finishedBatch(finishedBatch)
                .quantity(request.getQuantity())
                .build();

        PalletItem savedPalletItem =
                palletItemRepository.save(palletItem);

        return PalletResponse.builder()
                .palletId(savedPallet.getPalletId())
                .palletCode(savedPallet.getPalletCode())
                .barcode(savedPallet.getBarcode())
                .status(savedPallet.getStatus())
                .warehouseId(
                        savedPallet
                                .getWarehouse()
                                .getWarehouseId()
                )
                .binId(
                        savedPallet.getBin() != null
                                ? savedPallet
                                        .getBin()
                                        .getBinId()
                                : null
                )
                .finishedBatchId(
                        savedPalletItem
                                .getFinishedBatch()
                                .getFinishedBatchId()
                )
                .quantity(
                        savedPalletItem.getQuantity()
                )
                .build();
    }

    @Transactional(readOnly = true)
    public PalletResponse getPalletByIdentifier(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pallet identifier cannot be empty");
        }

        Pallet pallet = null;
        try {
            Long id = Long.parseLong(identifier.trim());
            pallet = palletRepository.findById(id).orElse(null);
        } catch (NumberFormatException ignored) {
        }

        if (pallet == null) {
            pallet = palletRepository.findByBarcode(identifier.trim())
                    .or(() -> palletRepository.findByPalletCode(identifier.trim()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pallet not found: " + identifier));
        }

        return PalletResponse.builder()
                .palletId(pallet.getPalletId())
                .palletCode(pallet.getPalletCode())
                .barcode(pallet.getBarcode())
                .status(pallet.getStatus())
                .warehouseId(pallet.getWarehouse() != null ? pallet.getWarehouse().getWarehouseId() : null)
                .binId(pallet.getBin() != null ? pallet.getBin().getBinId() : null)
                .build();
    }

    @Transactional(readOnly = true)
    public java.util.List<PalletResponse> getAllPallets() {
        return palletRepository.findAll().stream()
                .map(pallet -> PalletResponse.builder()
                        .palletId(pallet.getPalletId())
                        .palletCode(pallet.getPalletCode())
                        .barcode(pallet.getBarcode())
                        .status(pallet.getStatus())
                        .warehouseId(pallet.getWarehouse() != null ? pallet.getWarehouse().getWarehouseId() : null)
                        .binId(pallet.getBin() != null ? pallet.getBin().getBinId() : null)
                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public java.util.List<FinishedBatch> getFinishedBatches() {
        return finishedBatchRepository.findAll();
    }

    @Transactional(readOnly = true)
    public FinishedBatch getFinishedBatch(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Finished batch identifier cannot be empty");
        }
        try {
            Long id = Long.parseLong(identifier.trim());
            return finishedBatchRepository.findById(id)
                    .orElseGet(() -> finishedBatchRepository.findByBatchNo(identifier.trim())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Finished batch not found: " + identifier)));
        } catch (NumberFormatException ignored) {
            return finishedBatchRepository.findByBatchNo(identifier.trim())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Finished batch not found: " + identifier));
        }
    }
}
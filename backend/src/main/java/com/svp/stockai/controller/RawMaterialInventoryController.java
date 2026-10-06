package com.svp.stockai.controller;

import com.svp.stockai.dto.MaterialBatchResponse;
import com.svp.stockai.dto.RawMaterialReceiptRequest;
import com.svp.stockai.dto.RawMaterialReceiptResponse;
import com.svp.stockai.dto.RawMaterialResponse;
import com.svp.stockai.service.RawMaterialReceiptService;
import com.svp.stockai.service.RawMaterialQueryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/inventory/raw-materials")
@RequiredArgsConstructor
public class RawMaterialInventoryController {
    private final RawMaterialReceiptService rawMaterialReceiptService;
    private final RawMaterialQueryService rawMaterialQueryService;

    @PostMapping({"", "/receipts"})
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN')")
    public RawMaterialReceiptResponse receive(@Valid @RequestBody RawMaterialReceiptRequest request) {
        return rawMaterialReceiptService.receive(request);
    }

    @PostMapping("/definitions")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public RawMaterialResponse createRawMaterialDefinition(@Valid @RequestBody com.svp.stockai.dto.CreateRawMaterialRequest request) {
        return rawMaterialQueryService.createRawMaterial(request);
    }

    @GetMapping("/categories")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public List<com.svp.stockai.entity.MaterialCategory> categories() {
        return rawMaterialQueryService.getCategories();
    }

    @GetMapping("/uoms")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public List<com.svp.stockai.entity.UnitOfMeasure> uoms() {
        return rawMaterialQueryService.getUoms();
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public List<RawMaterialResponse> rawMaterials() {
        return rawMaterialQueryService.findAll();
    }

    @GetMapping("/{materialId:[0-9]+}")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public RawMaterialResponse rawMaterial(@PathVariable Long materialId) {
        return rawMaterialQueryService.findById(materialId);
    }

    @GetMapping({"/{materialId:[0-9]+}/batches/fifo", "/{materialId:[0-9]+}/batches"})
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public List<MaterialBatchResponse> fifoBatches(@PathVariable Long materialId) {
        return rawMaterialReceiptService.fifoBatches(materialId);
    }

    @GetMapping("/{materialId:[0-9]+}/available-stock")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public java.math.BigDecimal availableStock(@PathVariable Long materialId) {
        return rawMaterialQueryService.getAvailableStock(materialId);
    }
}

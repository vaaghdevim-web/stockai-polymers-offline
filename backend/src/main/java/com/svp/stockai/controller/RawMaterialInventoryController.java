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

    @GetMapping
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public List<RawMaterialResponse> rawMaterials() {
        return rawMaterialQueryService.findAll();
    }

    @GetMapping("/{materialId}")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public RawMaterialResponse rawMaterial(@PathVariable Long materialId) {
        return rawMaterialQueryService.findById(materialId);
    }

    @GetMapping({"/{materialId}/batches/fifo", "/{materialId}/batches"})
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public List<MaterialBatchResponse> fifoBatches(@PathVariable Long materialId) {
        return rawMaterialReceiptService.fifoBatches(materialId);
    }

    @GetMapping("/{materialId}/available-stock")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public java.math.BigDecimal availableStock(@PathVariable Long materialId) {
        return rawMaterialQueryService.getAvailableStock(materialId);
    }
}

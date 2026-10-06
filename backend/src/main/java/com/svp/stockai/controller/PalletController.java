package com.svp.stockai.controller;

import com.svp.stockai.dto.CreatePalletRequest;
import com.svp.stockai.dto.PalletResponse;
import com.svp.stockai.service.PalletService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/pallets")
@RequiredArgsConstructor
public class PalletController {

    private final PalletService palletService;

    @PostMapping
    @PreAuthorize("hasAnyRole('OPERATOR', 'ADMIN', 'SUPERVISOR')")
    public ResponseEntity<PalletResponse> createPallet(
            @Valid @RequestBody CreatePalletRequest request) {

        PalletResponse response =
                palletService.createPallet(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<java.util.List<PalletResponse>> getAllPallets() {
        return ResponseEntity.ok(palletService.getAllPallets());
    }

    @GetMapping("/finished-batches")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<java.util.List<com.svp.stockai.entity.FinishedBatch>> getFinishedBatches() {
        return ResponseEntity.ok(palletService.getFinishedBatches());
    }

    @GetMapping("/finished-batches/{identifier}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<com.svp.stockai.entity.FinishedBatch> getFinishedBatch(@PathVariable String identifier) {
        return ResponseEntity.ok(palletService.getFinishedBatch(identifier));
    }

    @GetMapping("/{identifier:[A-Za-z0-9\\-_]+}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PalletResponse> getPallet(@PathVariable String identifier) {
        PalletResponse response = palletService.getPalletByIdentifier(identifier);
        return ResponseEntity.ok(response);
    }
}
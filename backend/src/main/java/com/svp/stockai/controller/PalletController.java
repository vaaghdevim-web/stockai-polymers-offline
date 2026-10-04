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

    @GetMapping("/{identifier}")
    @PreAuthorize("hasAnyRole('OPERATOR', 'ADMIN', 'SUPERVISOR')")
    public ResponseEntity<PalletResponse> getPallet(@PathVariable String identifier) {
        PalletResponse response = palletService.getPalletByIdentifier(identifier);
        return ResponseEntity.ok(response);
    }
}
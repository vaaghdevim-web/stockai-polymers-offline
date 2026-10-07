package com.svp.stockai.controller;

import com.svp.stockai.dto.BatchRequirementCalculationResponse;
import com.svp.stockai.dto.CompoundingBomRequest;
import com.svp.stockai.dto.CompoundingBomResponse;
import com.svp.stockai.service.CompoundingBomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/factory/compounding/boms")
@RequiredArgsConstructor
public class CompoundingBomController {

    private final CompoundingBomService compoundingBomService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public CompoundingBomResponse create(
            @Valid @RequestBody CompoundingBomRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        return compoundingBomService.createBom(request, username);
    }

    @PutMapping("/{bomId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public CompoundingBomResponse update(
            @PathVariable Long bomId,
            @Valid @RequestBody CompoundingBomRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        return compoundingBomService.updateBom(bomId, request, username);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public List<CompoundingBomResponse> list(@RequestParam(required = false) String status) {
        return compoundingBomService.getAllBoms(status);
    }

    @GetMapping("/{bomId}")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public CompoundingBomResponse getById(@PathVariable Long bomId) {
        return compoundingBomService.getBomById(bomId);
    }

    @PatchMapping("/{bomId}/activate")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public CompoundingBomResponse activate(@PathVariable Long bomId) {
        return compoundingBomService.activateBom(bomId);
    }

    @PatchMapping("/{bomId}/retire")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public CompoundingBomResponse retire(@PathVariable Long bomId) {
        return compoundingBomService.retireBom(bomId);
    }

    @GetMapping("/{bomId}/calculate-requirements")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public BatchRequirementCalculationResponse calculateRequirements(
            @PathVariable Long bomId,
            @RequestParam BigDecimal batchWeightKg) {
        return compoundingBomService.calculateBatchRequirements(bomId, batchWeightKg);
    }
}

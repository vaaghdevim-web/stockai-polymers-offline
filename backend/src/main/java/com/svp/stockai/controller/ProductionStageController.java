package com.svp.stockai.controller;

import com.svp.stockai.dto.CompleteProductionStageRequest;
import com.svp.stockai.dto.ProductionStageResponse;
import com.svp.stockai.service.ProductionStateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({
    "/api/v1/production-runs/{productionId}/stages",
    "/api/v1/production/{productionId}/stages",
    "/api/v1/production/runs/{productionId}/stages"
})
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'MANAGER', 'ADMIN', 'PRODUCTION_MANAGER', 'PLANT_MANAGER', 'QUALITY_MANAGER', 'STORE_MANAGER', 'WAREHOUSE_INCHARGE', 'WAREHOUSE_EXECUTIVE', 'DISPATCH_EXECUTIVE', 'AUDITOR', 'FACTORY_DIRECTOR', 'ACCOUNTS_TEAM')")
public class ProductionStageController {
    private final ProductionStateService productionStateService;

    @org.springframework.web.bind.annotation.GetMapping
    public java.util.List<ProductionStageResponse> getStages(@PathVariable Long productionId) {
        return productionStateService.getStages(productionId);
    }

    @org.springframework.web.bind.annotation.GetMapping("/{stageId}")
    public ProductionStageResponse getStageById(@PathVariable Long productionId, @PathVariable Long stageId) {
        return productionStateService.getStage(productionId, stageId);
    }

    @PostMapping("/{stageId}/start")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN')")
    public ProductionStageResponse start(@PathVariable Long productionId, @PathVariable Long stageId) {
        return productionStateService.start(productionId, stageId);
    }

    @PostMapping("/{stageId}/complete")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN')")
    public ProductionStageResponse complete(@PathVariable Long productionId, @PathVariable Long stageId,
                                            @Valid @RequestBody CompleteProductionStageRequest request) {
        return productionStateService.complete(productionId, stageId, request);
    }
}

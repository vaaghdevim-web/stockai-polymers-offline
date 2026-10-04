package com.svp.stockai.controller;

import com.svp.stockai.dto.ProductionRunResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/wip")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'MANAGER', 'ADMIN', 'PRODUCTION_MANAGER', 'PLANT_MANAGER', 'QUALITY_MANAGER', 'STORE_MANAGER', 'WAREHOUSE_INCHARGE', 'WAREHOUSE_EXECUTIVE', 'DISPATCH_EXECUTIVE', 'AUDITOR', 'FACTORY_DIRECTOR', 'ACCOUNTS_TEAM')")
public class WipController {

    private final ProductionRunController productionRunController;

    @GetMapping
    public ResponseEntity<List<ProductionRunResponse>> getWipRecords(@RequestParam(required = false) Long plantId) {
        return productionRunController.getWipProductionRuns(plantId);
    }
}

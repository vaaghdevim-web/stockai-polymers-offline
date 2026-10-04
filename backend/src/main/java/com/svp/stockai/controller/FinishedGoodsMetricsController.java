package com.svp.stockai.controller;

import com.svp.stockai.dto.FinishedGoodsMetricsResponse;
import com.svp.stockai.service.FinishedGoodsMetricsService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/finished-goods")
@RequiredArgsConstructor
public class FinishedGoodsMetricsController {

    private final FinishedGoodsMetricsService finishedGoodsMetricsService;

    @GetMapping("/production/{productionId}/metrics")
    @PreAuthorize("hasAnyRole('OPERATOR', 'ADMIN', 'SUPERVISOR')")
    public ResponseEntity<FinishedGoodsMetricsResponse> getMetrics(
            @PathVariable Long productionId) {

        FinishedGoodsMetricsResponse response =
                finishedGoodsMetricsService.getMetrics(productionId);

        return ResponseEntity.ok(response);
    }
}
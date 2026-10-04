package com.svp.stockai.controller;

import com.svp.stockai.dto.PurchaseRecommendationResponse;
import com.svp.stockai.dto.ai.AiQueryRequest;
import com.svp.stockai.dto.ai.AiQueryResponse;
import com.svp.stockai.dto.ai.MaterialForecastResponse;
import com.svp.stockai.dto.ai.QcRootCauseResponse;
import com.svp.stockai.dto.ai.SupplierScoreResponse;
import com.svp.stockai.service.AiAnalyticsService;
import com.svp.stockai.service.AiCopilotService;
import com.svp.stockai.service.ReorderAlertService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
@Tag(name = "AI Service Engine", description = "AI Demand Forecasting, Supplier Scoring, QC Root Cause Analysis, and Conversational Copilot")
public class AiController {

    private final AiAnalyticsService aiAnalyticsService;
    private final AiCopilotService aiCopilotService;
    private final ReorderAlertService reorderAlertService;

    @PostMapping("/query")
    @Operation(summary = "Conversational Search Copilot", description = "Natural-language query engine against inventory, production, suppliers, and QC metrics")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR')")
    public ResponseEntity<AiQueryResponse> processCopilotQuery(@RequestBody AiQueryRequest request) {
        return ResponseEntity.ok(aiCopilotService.processQuery(request));
    }

    @GetMapping("/forecast")
    @Operation(summary = "Demand Forecasting", description = "Time-series demand forecasting and stock health projection for polymer raw materials")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SUPERVISOR')")
    public ResponseEntity<List<MaterialForecastResponse>> getDemandForecast(
            @RequestParam(required = false) Long materialId,
            @RequestParam(defaultValue = "30") int horizonDays) {
        return ResponseEntity.ok(aiAnalyticsService.generateDemandForecast(materialId, horizonDays));
    }

    @GetMapping("/suppliers/ranking")
    @Operation(summary = "Supplier Performance & Scoring", description = "Multi-factor reliability scoring based on QC pass rates, on-time delivery, and competitive pricing")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SUPERVISOR')")
    public ResponseEntity<List<SupplierScoreResponse>> getSupplierRankings() {
        return ResponseEntity.ok(aiAnalyticsService.evaluateSupplierPerformance());
    }

    @GetMapping("/qc/root-cause")
    @Operation(summary = "QC Defect Root Cause Analysis", description = "AI correlation linking defect parameters to machine telemetry and raw material batch characteristics")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SUPERVISOR')")
    public ResponseEntity<List<QcRootCauseResponse>> getQcRootCauses(
            @RequestParam(required = false) String batchNumber) {
        return ResponseEntity.ok(aiAnalyticsService.analyzeQcRootCauses(batchNumber));
    }

    @GetMapping("/reorder-recommendations")
    @Operation(summary = "Smart Purchase Recommendations", description = "AI-optimized reorder alerts and purchase proposals")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SUPERVISOR')")
    public ResponseEntity<List<PurchaseRecommendationResponse>> getReorderRecommendations(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority) {
        return ResponseEntity.ok(reorderAlertService.getRecommendations(status, priority));
    }
}

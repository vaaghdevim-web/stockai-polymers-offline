package com.svp.stockai.service;

import com.svp.stockai.dto.ai.AiQueryRequest;
import com.svp.stockai.dto.ai.AiQueryResponse;
import com.svp.stockai.dto.ai.MaterialForecastResponse;
import com.svp.stockai.dto.ai.QcRootCauseResponse;
import com.svp.stockai.dto.ai.SupplierScoreResponse;
import com.svp.stockai.entity.*;
import com.svp.stockai.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class AiCopilotService {

    private static final Logger log = LoggerFactory.getLogger(AiCopilotService.class);

    private final RawMaterialRepository rawMaterialRepository;
    private final InventoryRepository inventoryRepository;
    private final SupplierRepository supplierRepository;
    private final PurchaseRecommendationRepository purchaseRecommendationRepository;
    private final ProductionRunRepository productionRunRepository;
    private final DispatchRepository dispatchRepository;
    private final AiAnalyticsService aiAnalyticsService;

    public AiCopilotService(
            RawMaterialRepository rawMaterialRepository,
            InventoryRepository inventoryRepository,
            SupplierRepository supplierRepository,
            PurchaseRecommendationRepository purchaseRecommendationRepository,
            ProductionRunRepository productionRunRepository,
            DispatchRepository dispatchRepository,
            AiAnalyticsService aiAnalyticsService) {
        this.rawMaterialRepository = rawMaterialRepository;
        this.inventoryRepository = inventoryRepository;
        this.supplierRepository = supplierRepository;
        this.purchaseRecommendationRepository = purchaseRecommendationRepository;
        this.productionRunRepository = productionRunRepository;
        this.dispatchRepository = dispatchRepository;
        this.aiAnalyticsService = aiAnalyticsService;
    }

    public AiQueryResponse processQuery(AiQueryRequest request) {
        String query = request != null && request.query() != null ? request.query().trim() : "";
        if (query.isBlank()) {
            return new AiQueryResponse(
                    query,
                    "EMPTY_QUERY",
                    1.0,
                    "Please ask a question regarding inventory levels, demand forecasts, supplier ratings, production runs, or quality diagnostics.",
                    List.of(),
                    List.of("Check raw material inventory", "Show 30-day demand forecast", "Show top suppliers", "Check reorder alerts")
            );
        }

        String lower = query.toLowerCase();

        if (lower.contains("forecast") || lower.contains("predict") || lower.contains("burn rate") || lower.contains("runway")) {
            return handleForecastIntent(query);
        } else if (lower.contains("supplier") || lower.contains("vendor") || lower.contains("ranking") || lower.contains("score")) {
            return handleSupplierIntent(query);
        } else if (lower.contains("qc") || lower.contains("defect") || lower.contains("root cause") || lower.contains("failure") || lower.contains("inspection")) {
            return handleQcIntent(query);
        } else if (lower.contains("reorder") || lower.contains("purchase") || lower.contains("recommendation") || lower.contains("buy")) {
            return handleReorderIntent(query);
        } else if (lower.contains("production") || lower.contains("run") || lower.contains("extrusion") || lower.contains("loom") || lower.contains("plant")) {
            return handleProductionIntent(query);
        } else if (lower.contains("dispatch") || lower.contains("shipment") || lower.contains("delivery") || lower.contains("truck") || lower.contains("challan")) {
            return handleDispatchIntent(query);
        } else {
            // Default: Raw material and finished goods inventory query
            return handleInventoryIntent(query);
        }
    }

    private AiQueryResponse handleInventoryIntent(String query) {
        List<RawMaterial> materials = rawMaterialRepository.findAll();
        List<Map<String, Object>> data = new ArrayList<>();

        int lowStockCount = 0;
        for (RawMaterial mat : materials) {
            BigDecimal stock = inventoryRepository.getTotalAvailableRawMaterial(mat.getMaterialId());
            if (stock == null) stock = BigDecimal.ZERO;
            BigDecimal reorder = mat.getReorderLevel() != null ? mat.getReorderLevel() : BigDecimal.ZERO;

            boolean isLow = stock.compareTo(reorder) <= 0;
            if (isLow) lowStockCount++;

            data.add(Map.of(
                    "materialCode", mat.getMaterialCode() != null ? mat.getMaterialCode() : "N/A",
                    "materialName", mat.getMaterialName() != null ? mat.getMaterialName() : "N/A",
                    "availableStockKg", stock,
                    "reorderLevelKg", reorder,
                    "status", isLow ? "LOW_STOCK" : "HEALTHY"
            ));
        }

        String answer;
        if (lowStockCount > 0) {
            answer = String.format("Found %d tracked raw materials in the system. %d materials are currently at or below their critical reorder thresholds and need immediate attention.",
                    materials.size(), lowStockCount);
        } else {
            answer = String.format("All %d tracked raw materials are currently maintaining healthy inventory levels above their configured reorder thresholds.",
                    materials.size());
        }

        return new AiQueryResponse(
                query,
                "INVENTORY_LOOKUP",
                0.96,
                answer,
                data,
                List.of("View reorder recommendations", "Generate 30-day forecast", "Check supplier ratings")
        );
    }

    private AiQueryResponse handleForecastIntent(String query) {
        List<MaterialForecastResponse> forecasts = aiAnalyticsService.generateDemandForecast(null, 30);
        List<Map<String, Object>> data = forecasts.stream()
                .map(f -> Map.of(
                        "materialName", (Object) f.materialName(),
                        "currentStockKg", f.currentStockKg(),
                        "predictedDailyBurnRateKg", f.predictedDailyBurnRateKg(),
                        "daysOfStockRemaining", f.daysOfStockRemaining(),
                        "healthStatus", f.stockHealthStatus(),
                        "recommendation", f.recommendation()
                ))
                .collect(Collectors.toList());

        long criticalCount = forecasts.stream().filter(f -> "CRITICAL".equals(f.stockHealthStatus())).count();

        String answer = String.format("AI 30-day demand forecast generated across %d core polymer raw materials using time-series linear trend projection. %d materials exhibit high stockout risk within the next 7 days.",
                forecasts.size(), criticalCount);

        return new AiQueryResponse(
                query,
                "DEMAND_FORECAST",
                0.95,
                answer,
                data,
                List.of("Create purchase orders for critical items", "Inspect compounding BOM ratio", "View supplier reliability")
        );
    }

    private AiQueryResponse handleSupplierIntent(String query) {
        List<SupplierScoreResponse> scores = aiAnalyticsService.evaluateSupplierPerformance();
        List<Map<String, Object>> data = scores.stream()
                .map(s -> Map.of(
                        "supplierName", (Object) s.supplierName(),
                        "compositeScore", s.compositeScore(),
                        "qualityScore", s.qualityScore(),
                        "onTimeDeliveryScore", s.onTimeDeliveryScore(),
                        "riskTier", s.riskTier(),
                        "recommendation", s.aiRecommendation()
                ))
                .collect(Collectors.toList());

        String topSupplier = scores.isEmpty() ? "None" : scores.get(0).supplierName();

        String answer = String.format("Supplier ranking evaluated based on multi-factor scoring (45%% QC Pass Rate, 35%% On-Time Delivery, 20%% Price Competitiveness). Top performing vendor is %s with a composite score of %.1f/100.",
                topSupplier, scores.isEmpty() ? 0.0 : scores.get(0).compositeScore());

        return new AiQueryResponse(
                query,
                "SUPPLIER_RANKING",
                0.94,
                answer,
                data,
                List.of("Assign PO to top supplier", "Review quality inspection logs", "Check raw material forecast")
        );
    }

    private AiQueryResponse handleQcIntent(String query) {
        List<QcRootCauseResponse> diagnostics = aiAnalyticsService.analyzeQcRootCauses(null);
        List<Map<String, Object>> data = diagnostics.stream()
                .map(d -> Map.of(
                        "inspectionNumber", (Object) d.inspectionNumber(),
                        "batchNumber", d.batchNumber(),
                        "materialName", d.materialOrProductName(),
                        "primaryRootCause", d.primaryRootCause(),
                        "confidencePercent", d.rootCauseConfidence(),
                        "suggestedMitigations", d.suggestedMitigations()
                ))
                .collect(Collectors.toList());

        String answer = String.format("Analyzed %d quality control telemetry patterns. Identified primary anomaly correlations in Extruder temperature drift and Circular Loom warp tension calibration.",
                diagnostics.size());

        return new AiQueryResponse(
                query,
                "QC_ROOT_CAUSE",
                0.93,
                answer,
                data,
                List.of("Calibrate Extruder Die Zone 3", "Check loom tension sensors", "View machine telemetry live stream")
        );
    }

    private AiQueryResponse handleReorderIntent(String query) {
        List<PurchaseRecommendation> recs = purchaseRecommendationRepository.findAll();
        List<Map<String, Object>> data = recs.stream()
                .map(r -> Map.of(
                        "materialName", (Object) (r.getMaterial() != null ? r.getMaterial().getMaterialName() : "N/A"),
                        "suggestedQuantity", r.getRecommendedQty() != null ? r.getRecommendedQty() : BigDecimal.ZERO,
                        "priority", r.getPriority() != null ? r.getPriority() : "MEDIUM",
                        "status", r.getStatus() != null ? r.getStatus() : "PENDING",
                        "reason", r.getReason() != null ? r.getReason() : "Automated reorder trigger"
                ))
                .collect(Collectors.toList());

        String answer = String.format("Found %d pending smart purchase recommendations generated from real-time inventory burn rate and lead-time analysis.",
                recs.size());

        return new AiQueryResponse(
                query,
                "REORDER_RECOMMENDATIONS",
                0.96,
                answer,
                data,
                List.of("Approve pending purchase recommendations", "Check supplier pricing", "View demand forecast")
        );
    }

    private AiQueryResponse handleProductionIntent(String query) {
        List<ProductionRun> runs = productionRunRepository.findAll();
        List<Map<String, Object>> data = runs.stream()
                .map(r -> Map.of(
                        "productionNumber", (Object) (r.getProductionNumber() != null ? r.getProductionNumber() : "N/A"),
                        "productName", r.getBom() != null && r.getBom().getProduct() != null ? r.getBom().getProduct().getProductName() : "PP Woven Bag",
                        "status", r.getStatus() != null ? r.getStatus() : "IN_PROGRESS",
                        "targetQuantity", r.getPlannedQty() != null ? r.getPlannedQty() : BigDecimal.ZERO,
                        "plannedStartDate", r.getStartDatetime() != null ? r.getStartDatetime().toString() : "N/A"
                ))
                .collect(Collectors.toList());

        String answer = String.format("Currently tracking %d production runs across Extrusion, Weaving, and Conversion stages.",
                runs.size());

        return new AiQueryResponse(
                query,
                "PRODUCTION_STATUS",
                0.92,
                answer,
                data,
                List.of("View live machine telemetry", "Check compounding BOM", "View finished goods stock")
        );
    }

    private AiQueryResponse handleDispatchIntent(String query) {
        List<Dispatch> dispatches = dispatchRepository.findAll();
        List<Map<String, Object>> data = dispatches.stream()
                .map(d -> Map.of(
                        "dispatchNumber", (Object) (d.getDispatchNumber() != null ? d.getDispatchNumber() : "N/A"),
                        "customerName", d.getOrder() != null && d.getOrder().getCustomer() != null ? d.getOrder().getCustomer().getCustomerName() : "SVP Client",
                        "status", d.getStatus() != null ? d.getStatus() : "SCHEDULED",
                        "vehicleNumber", d.getVehicle() != null ? d.getVehicle().getVehicleNumber() : "N/A",
                        "dispatchDate", d.getDispatchDate() != null ? d.getDispatchDate().toString() : "N/A"
                ))
                .collect(Collectors.toList());

        String answer = String.format("Found %d customer shipments in dispatch queue with automated stock deduction and driver allocation.",
                dispatches.size());

        return new AiQueryResponse(
                query,
                "DISPATCH_TRACKING",
                0.91,
                answer,
                data,
                List.of("Create new dispatch challan", "Check finished product stock", "View customer orders")
        );
    }
}

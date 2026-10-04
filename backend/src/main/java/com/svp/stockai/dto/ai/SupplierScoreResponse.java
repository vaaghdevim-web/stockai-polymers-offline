package com.svp.stockai.dto.ai;

import java.math.BigDecimal;
import java.util.List;

public record SupplierScoreResponse(
        Long supplierId,
        String supplierName,
        String gstNo,
        double compositeScore, // 0.0 - 100.0
        double qualityScore, // Based on QC pass/reject rates
        double onTimeDeliveryScore, // Based on intake timelines
        double priceCompetitivenessScore, // Based on comparative catalog rates
        int totalBatchesSupplied,
        double rejectionRatePercent,
        String riskTier, // "LOW_RISK", "MEDIUM_RISK", "HIGH_RISK"
        List<String> suppliedMaterials,
        String aiRecommendation
) {
}

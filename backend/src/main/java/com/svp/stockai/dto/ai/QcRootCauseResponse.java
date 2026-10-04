package com.svp.stockai.dto.ai;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record QcRootCauseResponse(
        String inspectionNumber,
        String batchNumber,
        String materialOrProductName,
        String inspectionStage, // "RAW_MATERIAL", "EXTRUSION_TAPE", "WEAVING_FABRIC", "CONVERSION_BAG"
        String defectSummary,
        double anomalySeverityScore, // 0.0 - 1.0
        double rootCauseConfidence, // 0.0 - 100.0%
        String primaryRootCause,
        List<CorrelationFactor> correlationFactors,
        List<String> suggestedMitigations,
        Instant detectedAt
) {
    public record CorrelationFactor(
            String factorName,
            String observedValue,
            String normalBaseline,
            String impactLevel // "HIGH", "MEDIUM", "LOW"
    ) {}
}

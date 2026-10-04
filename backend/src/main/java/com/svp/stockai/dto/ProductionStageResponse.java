package com.svp.stockai.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ProductionStageResponse(
        Long stageId,
        Long productionId,
        int sequenceNo,
        String stageName,
        String status,
        Long unitId,
        String unitCode,
        String unitName,
        Long machineId,
        String machineCode,
        String machineName,
        BigDecimal inputWeightKg,
        BigDecimal outputWeightKg,
        BigDecimal scrapWeightKg,
        OffsetDateTime startedAt,
        OffsetDateTime completedAt
) {
    // Backward-compatible 9-argument constructor
    public ProductionStageResponse(
            Long stageId,
            Long productionId,
            int sequenceNo,
            String status,
            BigDecimal inputWeightKg,
            BigDecimal outputWeightKg,
            BigDecimal scrapWeightKg,
            OffsetDateTime startedAt,
            OffsetDateTime completedAt) {
        this(stageId, productionId, sequenceNo, null, status, null, null, null, null, null, null,
                inputWeightKg, outputWeightKg, scrapWeightKg, startedAt, completedAt);
    }
}

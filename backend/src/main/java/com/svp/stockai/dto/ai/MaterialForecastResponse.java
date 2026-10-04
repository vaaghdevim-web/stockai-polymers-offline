package com.svp.stockai.dto.ai;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record MaterialForecastResponse(
        Long materialId,
        String materialCode,
        String materialName,
        String category,
        String unitOfMeasure,
        BigDecimal currentStockKg,
        BigDecimal reorderLevelKg,
        BigDecimal avgDailyConsumptionKg,
        BigDecimal predictedDailyBurnRateKg,
        int daysOfStockRemaining,
        String stockHealthStatus, // "OPTIMAL", "WARNING", "CRITICAL"
        double modelConfidence,
        String recommendation,
        List<DailyDemandProjection> projections
) {
    public record DailyDemandProjection(
            LocalDate date,
            BigDecimal forecastedDemandKg,
            BigDecimal projectedClosingStockKg,
            boolean stockoutRisk
    ) {}
}

package com.svp.stockai.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CompleteProductionStageRequest(
        @NotNull @DecimalMin("0.0") BigDecimal inputWeightKg,
        @NotNull @DecimalMin("0.0") BigDecimal outputWeightKg,
        @NotNull @DecimalMin("0.0") BigDecimal scrapWeightKg) {
}

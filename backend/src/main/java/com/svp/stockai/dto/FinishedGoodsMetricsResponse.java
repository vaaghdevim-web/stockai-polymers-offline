package com.svp.stockai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinishedGoodsMetricsResponse {

    private Long productionId;

    private BigDecimal inputWeightKg;
    private BigDecimal outputWeightKg;
    private BigDecimal scrapWeightKg;

    private BigDecimal yieldPercentage;
    private BigDecimal scrapPercentage;

    private Integer bagsProduced;

    private BigDecimal averageBagWeightG;
    private BigDecimal bagsPerKg;
}
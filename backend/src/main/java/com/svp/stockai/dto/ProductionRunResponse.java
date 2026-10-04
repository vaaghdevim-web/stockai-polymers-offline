package com.svp.stockai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductionRunResponse {
    private Long productionId;
    private Long plantId;
    private String plantName;
    private Long bomId;
    private Long productId;
    private String productName;
    private String productCode;
    private String productionNumber;
    private OffsetDateTime startDatetime;
    private OffsetDateTime endDatetime;
    private String status;
    private String currentStage;
    private Integer currentStageSequence;
    private BigDecimal plannedQty;
    private BigDecimal actualQty;
    private BigDecimal inputWeightKg;
    private BigDecimal outputWeightKg;
    private BigDecimal scrapWeightKg;
    private BigDecimal yieldPercentage;
    private BigDecimal bagsProduced;
    private BigDecimal bagsPerKg;
    private java.util.List<ProductionStageResponse> stages;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}

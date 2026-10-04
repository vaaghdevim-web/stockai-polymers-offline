package com.svp.stockai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseRecommendationResponse {

    private Long recommendationId;
    private Long materialId;
    private String materialCode;
    private String materialName;
    private Long plantId;
    private String plantName;
    private LocalDate recommendedDate;
    private BigDecimal recommendedQty;
    private BigDecimal estimatedCost;
    private BigDecimal safetyStock;
    private BigDecimal currentStock;
    private Integer leadTimeDays;
    private String priority;
    private String reason;
    private String status;
    private String approvedByUserName;
    private OffsetDateTime approvedAt;
}

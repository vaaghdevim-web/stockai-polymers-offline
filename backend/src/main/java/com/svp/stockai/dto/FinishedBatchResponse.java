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
public class FinishedBatchResponse {
    private Long finishedBatchId;
    private String batchNo;
    private Long productId;
    private String productCode;
    private String productName;
    private String productCategory;
    private LocalDate productionDate;
    private LocalDate expiryDate;
    private BigDecimal qtyProduced;
    private BigDecimal qtyRejected;
    private BigDecimal inputWeightKg;
    private BigDecimal outputWeightKg;
    private BigDecimal scrapWeightKg;
    private BigDecimal bagsProduced;
    private BigDecimal averageBagWeightG;
    private BigDecimal bagsPerKg;
    private String qualityStatus;
    private Boolean isActive;
    private OffsetDateTime createdAt;
}

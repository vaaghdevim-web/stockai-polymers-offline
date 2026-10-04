package com.svp.stockai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinishedProductResponse {
    private Long productId;
    private String productCode;
    private String productName;
    private Long categoryId;
    private String categoryName;
    private BigDecimal standardCost;
    private Long defaultUomId;
    private String defaultUomCode;
    private Boolean isActive;
}

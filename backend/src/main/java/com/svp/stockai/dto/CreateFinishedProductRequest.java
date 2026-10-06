package com.svp.stockai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateFinishedProductRequest {

    @NotBlank(message = "Product name is required")
    private String productName;

    private String productCode;

    private Long categoryId;

    private String categoryName;

    private Long defaultUomId;

    private BigDecimal standardCost;

    private BigDecimal sellingPrice;

    private BigDecimal reorderLevel;

    private Boolean isActive;
}

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
public class CompoundingBomItemResponse {

    private Long compoundingBomItemId;
    private Long materialId;
    private String materialCode;
    private String materialName;
    private String categoryName;
    private BigDecimal percentage;
    private BigDecimal targetQuantityKg;
    private Boolean isRequired;
}

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
public class CreateRawMaterialRequest {

    @NotBlank(message = "Material name is required")
    private String materialName;

    private String materialCode;

    private Long categoryId;

    private Long defaultUomId;

    @Builder.Default
    private BigDecimal standardCost = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal reorderLevel = new BigDecimal("5000");

    @Builder.Default
    private BigDecimal safetyStock = new BigDecimal("2000");

    @Builder.Default
    private Integer leadTimeDays = 7;
}

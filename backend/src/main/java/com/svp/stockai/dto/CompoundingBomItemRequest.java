package com.svp.stockai.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompoundingBomItemRequest {

    @NotNull(message = "Material ID is required")
    private Long materialId;

    @NotNull(message = "Percentage is required")
    @DecimalMin(value = "0.0001", message = "Percentage must be greater than 0")
    @DecimalMax(value = "100.0000", message = "Percentage cannot exceed 100")
    private BigDecimal percentage;

    @Builder.Default
    private Boolean isRequired = true;
}

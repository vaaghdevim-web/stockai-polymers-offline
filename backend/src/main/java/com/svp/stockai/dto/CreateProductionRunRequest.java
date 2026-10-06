package com.svp.stockai.dto;

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
public class CreateProductionRunRequest {

    private String productionNumber;

    private Long bomId;

    private Long productId;

    private Long plantId;

    private Long machineId;

    @NotNull(message = "Planned quantity is required")
    @DecimalMin(value = "0.01", message = "Planned quantity must be greater than 0")
    private BigDecimal plannedQty;
}

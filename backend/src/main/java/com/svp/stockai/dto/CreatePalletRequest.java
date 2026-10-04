package com.svp.stockai.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
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
public class CreatePalletRequest {

    @NotNull
    private Long finishedBatchId;

    @NotNull
    private Long warehouseId;

    private Long binId;

    @NotNull
    @Positive
    private BigDecimal quantity;
}
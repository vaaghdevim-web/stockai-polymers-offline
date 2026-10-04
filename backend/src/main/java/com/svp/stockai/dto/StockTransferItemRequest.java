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
public class StockTransferItemRequest {

    private Long materialBatchId;

    private Long finishedBatchId;

    @NotNull(message = "Source bin (fromBinId) is required")
    private Long fromBinId;

    @NotNull(message = "Destination bin (toBinId) is required")
    private Long toBinId;

    @NotNull(message = "Transfer quantity is required")
    @DecimalMin(value = "0.0001", message = "Transfer quantity must be greater than 0")
    private BigDecimal quantity;

    private Long uomId;

    private String uomCode;
}

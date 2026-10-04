package com.svp.stockai.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockTransferRequest {

    @NotNull(message = "Source warehouse (fromWarehouseId) is required")
    private Long fromWarehouseId;

    @NotNull(message = "Destination warehouse (toWarehouseId) is required")
    private Long toWarehouseId;

    private LocalDate transferDate;

    private Boolean autoComplete;

    @NotEmpty(message = "At least one transfer item must be provided")
    @Valid
    private List<StockTransferItemRequest> items;
}

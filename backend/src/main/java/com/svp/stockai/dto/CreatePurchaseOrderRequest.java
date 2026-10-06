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
public class CreatePurchaseOrderRequest {

    @NotNull(message = "Supplier ID is required")
    private Long supplierId;

    private Long plantId;

    private LocalDate poDate;

    private Long recommendationId;

    private String status; // Draft, Approved

    @NotEmpty(message = "At least one purchase order item is required")
    @Valid
    private List<PurchaseOrderItemRequest> items;
}

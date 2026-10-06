package com.svp.stockai.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCustomerOrderRequest {

    @NotNull(message = "Customer ID is required")
    private Long customerId;

    private String orderNumber;

    private Long plantId;

    private LocalDate requiredDate;

    private String shippingAddressText;

    private String paymentStatus;

    private List<OrderItemRequest> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderItemRequest {
        @NotNull(message = "Product ID is required")
        private Long productId;

        @NotNull(message = "Ordered quantity is required")
        private BigDecimal orderedQty;

        private BigDecimal rate;
    }
}

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

        private BigDecimal orderedQty;

        private BigDecimal quantity;

        private BigDecimal rate;

        private BigDecimal unitPrice;

        public BigDecimal getEffectiveQty() {
            if (orderedQty != null && orderedQty.compareTo(BigDecimal.ZERO) > 0) return orderedQty;
            if (quantity != null && quantity.compareTo(BigDecimal.ZERO) > 0) return quantity;
            return BigDecimal.ZERO;
        }

        public BigDecimal getEffectiveRate() {
            if (rate != null && rate.compareTo(BigDecimal.ZERO) > 0) return rate;
            if (unitPrice != null && unitPrice.compareTo(BigDecimal.ZERO) > 0) return unitPrice;
            return null;
        }
    }
}

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
public class CustomerOrderItemResponse {
    private Long orderItemId;
    private Long orderId;
    private Long productId;
    private String productCode;
    private String productName;
    private BigDecimal orderedQty;
    private BigDecimal fulfilledQty;
    private BigDecimal pendingQty;
    private BigDecimal rate;
    private BigDecimal discountAmount;
    private BigDecimal taxAmount;
    private BigDecimal lineTotal;
}

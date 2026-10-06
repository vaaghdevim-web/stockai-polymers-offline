package com.svp.stockai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerOrderResponse {
    private Long orderId;
    private String orderNumber;
    private Long customerId;
    private String customerName;
    private String customerCode;
    private Long plantId;
    private String plantName;
    private LocalDate orderDate;
    private LocalDate requiredDate;
    private String status;
    private BigDecimal subtotal;
    private BigDecimal discountAmount;
    private BigDecimal taxAmount;
    private BigDecimal grandTotal;
    private String paymentStatus;
    private String shippingAddress;
    private List<CustomerOrderItemResponse> items;
    private OffsetDateTime createdAt;
}

package com.svp.stockai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DispatchResponse {
    private Long dispatchId;
    private String dispatchNumber;
    private Long orderId;
    private String orderNumber;
    private String customerName;
    private Long vehicleId;
    private String vehicleNumber;
    private Long driverId;
    private String driverName;
    private String driverPhone;
    private LocalDate dispatchDate;
    private LocalDate expectedDeliveryDate;
    private LocalDate actualDeliveryDate;
    private String status;
    private String carrier;
    private String shippingMethod;
    private String trackingNumber;
    private String createdByUserName;
    private OffsetDateTime createdAt;
    private List<DispatchItemResponse> items;
}

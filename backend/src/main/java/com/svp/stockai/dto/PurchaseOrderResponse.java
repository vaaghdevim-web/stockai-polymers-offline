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
public class PurchaseOrderResponse {

    private Long poId;
    private String poNumber;
    private Long supplierId;
    private String supplierCode;
    private String supplierName;
    private Long plantId;
    private String plantCode;
    private String plantName;
    private LocalDate poDate;
    private String status;
    private BigDecimal totalAmount;
    private Long recommendationId;
    private String createdByUserName;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private List<PurchaseOrderItemResponse> items;
}

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
public class StockTransferResponse {

    private Long transferId;
    private String transferNumber;
    private Long fromWarehouseId;
    private String fromWarehouseName;
    private Long toWarehouseId;
    private String toWarehouseName;
    private LocalDate transferDate;
    private String status;
    private String createdByUserName;
    private OffsetDateTime createdAt;
    private List<StockTransferItemResponse> items;
}

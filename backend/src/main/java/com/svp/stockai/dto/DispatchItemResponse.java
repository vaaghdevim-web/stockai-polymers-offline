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
public class DispatchItemResponse {
    private Long dispatchItemId;
    private Long allocationId;
    private Long finishedBatchId;
    private String finishedBatchNo;
    private String productCode;
    private String productName;
    private BigDecimal quantity;
    private String uom;
}

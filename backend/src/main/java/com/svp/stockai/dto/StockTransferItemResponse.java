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
public class StockTransferItemResponse {

    private Long stiId;
    private Long materialBatchId;
    private String materialBatchNo;
    private Long finishedBatchId;
    private String finishedBatchNo;
    private Long fromBinId;
    private String fromBinCode;
    private Long toBinId;
    private String toBinCode;
    private BigDecimal quantity;
    private Long uomId;
    private String uomCode;
}

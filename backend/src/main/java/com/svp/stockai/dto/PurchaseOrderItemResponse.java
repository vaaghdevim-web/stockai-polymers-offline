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
public class PurchaseOrderItemResponse {

    private Long poItemId;
    private Long poId;
    private Long materialId;
    private String materialCode;
    private String materialName;
    private Long uomId;
    private String uomCode;
    private BigDecimal quantity;
    private BigDecimal rate;
    private BigDecimal itemTotal;
}

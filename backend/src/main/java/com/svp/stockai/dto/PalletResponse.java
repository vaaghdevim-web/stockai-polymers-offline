package com.svp.stockai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PalletResponse {

    private Long palletId;

    private String palletCode;

    private String barcode;

    private String status;

    private Long warehouseId;

    private Long binId;

    private Long finishedBatchId;

    private BigDecimal quantity;
}
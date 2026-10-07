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
public class LocationBinResponse {
    private Long binId;
    private Long warehouseId;
    private String warehouseName;
    private Long shelfId;
    private String shelfCode;
    private String rackCode;
    private String binCode;
    private Boolean isActive;

    private BigDecimal capacityKg;
    private BigDecimal currentStockKg;
    private BigDecimal availableCapacityKg;
    private Double utilizationPct;
    private String status;
    private Integer activePalletCount;
}

package com.svp.stockai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchLocationResponse {
    private String batchNo;
    private String lotNumber;
    private String batchType; // "RAW_MATERIAL" | "FINISHED_GOODS"
    private Long materialId;
    private String materialName;
    private String materialCode;
    private String categoryName;

    private BigDecimal quantityKg;
    private BigDecimal initialWeightKg;
    private BigDecimal currentWeightKg;
    private String qualityStatus;
    private String status;
    private OffsetDateTime receivedOrProducedAt;

    private Long warehouseId;
    private String warehouseName;
    private String warehouseType;
    private String zone;

    private Long rackId;
    private String rackCode;

    private Long shelfId;
    private String shelfCode;
    private Integer shelfLevel;

    private Long binId;
    private String binCode;
    private BigDecimal binCapacityKg;
    private BigDecimal binOccupiedKg;
    private BigDecimal binAvailableKg;
    private Double binOccupancyPct;
    private String binStatus; // "EMPTY" | "PARTIALLY OCCUPIED" | "FULL" | "OVER CAPACITY"

    private String exactLocation; // "Warehouse WH-01 → Rack R-03 → Shelf S-02 → Bin B-05"
}

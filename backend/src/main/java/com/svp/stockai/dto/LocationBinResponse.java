package com.svp.stockai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
}

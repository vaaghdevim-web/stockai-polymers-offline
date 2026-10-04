package com.svp.stockai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WarehouseResponse {
    private Long warehouseId;
    private Long plantId;
    private String plantName;
    private String warehouseName;
    private String type;
    private Boolean isActive;
}

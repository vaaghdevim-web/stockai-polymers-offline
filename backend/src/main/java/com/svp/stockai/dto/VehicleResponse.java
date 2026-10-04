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
public class VehicleResponse {
    private Long vehicleId;
    private String vehicleNumber;
    private String vehicleType;
    private BigDecimal capacity;
    private String capacityUomCode;
    private Boolean isActive;
}

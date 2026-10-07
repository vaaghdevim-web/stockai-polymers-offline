package com.svp.stockai.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VehicleRequest {

    @NotBlank(message = "Vehicle registration number is required")
    private String vehicleNumber;

    private String vehicleType;

    @DecimalMin(value = "0.001", message = "Capacity must be greater than zero")
    private BigDecimal capacity;

    private Long capacityUomId;
    private String capacityUomCode;

    @Builder.Default
    private Boolean isActive = true;
}

package com.svp.stockai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateWarehouseRequest {
    @NotNull(message = "Plant ID is required")
    private Long plantId;

    @NotBlank(message = "Warehouse name is required")
    private String warehouseName;

    private String type; // 'Raw', 'FG', 'Both'

    private Boolean isActive;
}

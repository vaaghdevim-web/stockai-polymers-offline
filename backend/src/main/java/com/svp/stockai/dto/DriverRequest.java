package com.svp.stockai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriverRequest {

    @NotBlank(message = "Driver name is required")
    private String driverName;

    @NotBlank(message = "License number is required")
    private String licenseNumber;

    private LocalDate licenseExpiry;

    private String phone;

    @Builder.Default
    private Boolean isActive = true;
}

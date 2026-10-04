package com.svp.stockai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriverResponse {
    private Long driverId;
    private String driverName;
    private String licenseNumber;
    private LocalDate licenseExpiry;
    private String phone;
    private Boolean isActive;
}

package com.svp.stockai.controller;

import com.svp.stockai.dto.DriverResponse;
import com.svp.stockai.entity.Driver;
import com.svp.stockai.repository.DriverRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/drivers")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'MANAGER', 'ADMIN')")
public class DriverController {

    private final DriverRepository driverRepository;

    @GetMapping
    public List<DriverResponse> getAllDrivers() {
        return driverRepository.findAll().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @GetMapping("/{id}")
    public DriverResponse getDriverById(@PathVariable Long id) {
        Driver d = driverRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver not found with ID: " + id));
        return mapToResponse(d);
    }

    private DriverResponse mapToResponse(Driver d) {
        return DriverResponse.builder()
                .driverId(d.getDriverId())
                .driverName(d.getDriverName())
                .licenseNumber(d.getLicenseNumber())
                .licenseExpiry(d.getLicenseExpiry())
                .phone(d.getPhone())
                .isActive(d.getIsActive())
                .build();
    }
}

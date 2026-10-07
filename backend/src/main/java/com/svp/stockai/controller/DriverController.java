package com.svp.stockai.controller;

import com.svp.stockai.dto.DriverRequest;
import com.svp.stockai.dto.DriverResponse;
import com.svp.stockai.entity.Driver;
import com.svp.stockai.repository.DriverRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
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

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'MANAGER', 'ADMIN')")
    @Transactional
    public DriverResponse createDriver(@Valid @RequestBody DriverRequest request) {
        if (driverRepository.findByLicenseNumber(request.getLicenseNumber()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Driver license number already registered: " + request.getLicenseNumber());
        }

        Driver driver = Driver.builder()
                .driverName(request.getDriverName().trim())
                .licenseNumber(request.getLicenseNumber().trim())
                .licenseExpiry(request.getLicenseExpiry())
                .phone(request.getPhone())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        return mapToResponse(driverRepository.save(driver));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'MANAGER', 'ADMIN')")
    @Transactional
    public DriverResponse updateDriver(@PathVariable Long id, @Valid @RequestBody DriverRequest request) {
        Driver driver = driverRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver not found with ID: " + id));

        driverRepository.findByLicenseNumber(request.getLicenseNumber())
                .ifPresent(existing -> {
                    if (!existing.getDriverId().equals(id)) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "Driver license number already in use: " + request.getLicenseNumber());
                    }
                });

        driver.setDriverName(request.getDriverName().trim());
        driver.setLicenseNumber(request.getLicenseNumber().trim());
        driver.setLicenseExpiry(request.getLicenseExpiry());
        driver.setPhone(request.getPhone());
        if (request.getIsActive() != null) {
            driver.setIsActive(request.getIsActive());
        }

        return mapToResponse(driverRepository.save(driver));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'MANAGER', 'ADMIN')")
    @Transactional
    public void deleteDriver(@PathVariable Long id) {
        Driver driver = driverRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver not found with ID: " + id));
        driverRepository.delete(driver);
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

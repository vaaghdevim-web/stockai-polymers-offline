package com.svp.stockai.controller;

import com.svp.stockai.dto.VehicleResponse;
import com.svp.stockai.entity.Vehicle;
import com.svp.stockai.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/vehicles")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'MANAGER', 'ADMIN')")
public class VehicleController {

    private final VehicleRepository vehicleRepository;

    @GetMapping
    public List<VehicleResponse> getAllVehicles() {
        return vehicleRepository.findAll().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @GetMapping("/{id}")
    public VehicleResponse getVehicleById(@PathVariable Long id) {
        Vehicle v = vehicleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found with ID: " + id));
        return mapToResponse(v);
    }

    private VehicleResponse mapToResponse(Vehicle v) {
        return VehicleResponse.builder()
                .vehicleId(v.getVehicleId())
                .vehicleNumber(v.getVehicleNumber())
                .vehicleType(v.getVehicleType())
                .capacity(v.getCapacity())
                .capacityUomCode(v.getCapacityUom() != null ? v.getCapacityUom().getUomCode() : null)
                .isActive(v.getIsActive())
                .build();
    }
}

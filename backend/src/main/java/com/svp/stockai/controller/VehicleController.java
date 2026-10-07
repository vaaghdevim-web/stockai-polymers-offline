package com.svp.stockai.controller;

import com.svp.stockai.dto.VehicleRequest;
import com.svp.stockai.dto.VehicleResponse;
import com.svp.stockai.entity.UnitOfMeasure;
import com.svp.stockai.entity.Vehicle;
import com.svp.stockai.repository.UnitOfMeasureRepository;
import com.svp.stockai.repository.VehicleRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/vehicles")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'MANAGER', 'ADMIN')")
public class VehicleController {

    private final VehicleRepository vehicleRepository;
    private final UnitOfMeasureRepository unitOfMeasureRepository;

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

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'MANAGER', 'ADMIN')")
    @Transactional
    public VehicleResponse createVehicle(@Valid @RequestBody VehicleRequest request) {
        if (vehicleRepository.findByVehicleNumber(request.getVehicleNumber()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Vehicle registration number already exists: " + request.getVehicleNumber());
        }

        UnitOfMeasure uom = null;
        if (request.getCapacityUomId() != null) {
            uom = unitOfMeasureRepository.findById(request.getCapacityUomId()).orElse(null);
        } else if (request.getCapacityUomCode() != null) {
            uom = unitOfMeasureRepository.findByUomCode(request.getCapacityUomCode()).orElse(null);
        }

        Vehicle vehicle = Vehicle.builder()
                .vehicleNumber(request.getVehicleNumber().trim())
                .vehicleType(request.getVehicleType())
                .capacity(request.getCapacity())
                .capacityUom(uom)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        return mapToResponse(vehicleRepository.save(vehicle));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'MANAGER', 'ADMIN')")
    @Transactional
    public VehicleResponse updateVehicle(@PathVariable Long id, @Valid @RequestBody VehicleRequest request) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found with ID: " + id));

        vehicleRepository.findByVehicleNumber(request.getVehicleNumber())
                .ifPresent(existing -> {
                    if (!existing.getVehicleId().equals(id)) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "Vehicle registration number already in use: " + request.getVehicleNumber());
                    }
                });

        UnitOfMeasure uom = null;
        if (request.getCapacityUomId() != null) {
            uom = unitOfMeasureRepository.findById(request.getCapacityUomId()).orElse(null);
        } else if (request.getCapacityUomCode() != null) {
            uom = unitOfMeasureRepository.findByUomCode(request.getCapacityUomCode()).orElse(null);
        }

        vehicle.setVehicleNumber(request.getVehicleNumber().trim());
        vehicle.setVehicleType(request.getVehicleType());
        vehicle.setCapacity(request.getCapacity());
        if (uom != null) {
            vehicle.setCapacityUom(uom);
        }
        if (request.getIsActive() != null) {
            vehicle.setIsActive(request.getIsActive());
        }

        return mapToResponse(vehicleRepository.save(vehicle));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'MANAGER', 'ADMIN')")
    @Transactional
    public void deleteVehicle(@PathVariable Long id) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found with ID: " + id));
        vehicleRepository.delete(vehicle);
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

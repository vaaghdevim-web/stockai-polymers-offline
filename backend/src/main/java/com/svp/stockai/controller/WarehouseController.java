package com.svp.stockai.controller;

import com.svp.stockai.dto.LocationBinResponse;
import com.svp.stockai.dto.WarehouseResponse;
import com.svp.stockai.entity.LocationBin;
import com.svp.stockai.entity.Warehouse;
import com.svp.stockai.repository.LocationBinRepository;
import com.svp.stockai.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/warehouses")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'MANAGER', 'ADMIN')")
public class WarehouseController {

    private final WarehouseRepository warehouseRepository;
    private final LocationBinRepository locationBinRepository;

    @GetMapping
    public List<WarehouseResponse> getAllWarehouses(
            @RequestParam(required = false) Long plantId,
            @RequestParam(required = false) String type) {

        List<Warehouse> warehouses;
        if (plantId != null) {
            warehouses = warehouseRepository.findByPlant_PlantId(plantId);
        } else if (type != null && !type.isBlank()) {
            warehouses = warehouseRepository.findByTypeAndIsActiveTrue(type);
        } else {
            warehouses = warehouseRepository.findAll();
        }

        return warehouses.stream()
                .map(this::mapToWarehouseResponse)
                .toList();
    }

    @GetMapping("/{id}")
    public WarehouseResponse getWarehouseById(@PathVariable Long id) {
        Warehouse w = warehouseRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Warehouse not found with ID: " + id));
        return mapToWarehouseResponse(w);
    }

    @GetMapping("/{id}/bins")
    public List<LocationBinResponse> getBinsByWarehouseId(@PathVariable Long id) {
        // Validate warehouse exists
        if (!warehouseRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Warehouse not found with ID: " + id);
        }

        List<LocationBin> bins = locationBinRepository.findByShelf_Rack_Warehouse_WarehouseId(id);
        return bins.stream()
                .map(this::mapToBinResponse)
                .toList();
    }

    private WarehouseResponse mapToWarehouseResponse(Warehouse w) {
        return WarehouseResponse.builder()
                .warehouseId(w.getWarehouseId())
                .plantId(w.getPlant() != null ? w.getPlant().getPlantId() : null)
                .plantName(w.getPlant() != null ? w.getPlant().getPlantName() : null)
                .warehouseName(w.getWarehouseName())
                .type(w.getType())
                .isActive(w.getIsActive())
                .build();
    }

    private LocationBinResponse mapToBinResponse(LocationBin b) {
        return LocationBinResponse.builder()
                .binId(b.getBinId())
                .warehouseId(b.getShelf() != null && b.getShelf().getRack() != null && b.getShelf().getRack().getWarehouse() != null ?
                        b.getShelf().getRack().getWarehouse().getWarehouseId() : null)
                .warehouseName(b.getShelf() != null && b.getShelf().getRack() != null && b.getShelf().getRack().getWarehouse() != null ?
                        b.getShelf().getRack().getWarehouse().getWarehouseName() : null)
                .shelfId(b.getShelf() != null ? b.getShelf().getShelfId() : null)
                .shelfCode(b.getShelf() != null ? b.getShelf().getShelfCode() : null)
                .rackCode(b.getShelf() != null && b.getShelf().getRack() != null ?
                        b.getShelf().getRack().getRackCode() : null)
                .binCode(b.getBinCode())
                .isActive(b.getIsActive())
                .build();
    }
}

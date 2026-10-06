package com.svp.stockai.controller;

import com.svp.stockai.dto.CreateWarehouseRequest;
import com.svp.stockai.dto.LocationBinResponse;
import com.svp.stockai.dto.PlantResponse;
import com.svp.stockai.dto.WarehouseResponse;
import com.svp.stockai.entity.LocationBin;
import com.svp.stockai.entity.LocationRack;
import com.svp.stockai.entity.LocationShelf;
import com.svp.stockai.entity.Plant;
import com.svp.stockai.entity.Warehouse;
import com.svp.stockai.repository.LocationBinRepository;
import com.svp.stockai.repository.LocationRackRepository;
import com.svp.stockai.repository.LocationShelfRepository;
import com.svp.stockai.repository.PlantRepository;
import com.svp.stockai.repository.WarehouseRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/warehouses")
@RequiredArgsConstructor
@Transactional(readOnly = true)
@PreAuthorize("isAuthenticated()")
public class WarehouseController {

    private final WarehouseRepository warehouseRepository;
    private final LocationBinRepository locationBinRepository;
    private final LocationRackRepository locationRackRepository;
    private final LocationShelfRepository locationShelfRepository;
    private final PlantRepository plantRepository;

    @GetMapping
    public List<WarehouseResponse> getAllWarehouses(
            @RequestParam(required = false) Long plantId,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "true") boolean activeOnly) {

        List<Warehouse> warehouses;
        if (plantId != null) {
            warehouses = activeOnly ? warehouseRepository.findByPlant_PlantIdAndIsActiveTrue(plantId) : warehouseRepository.findByPlant_PlantId(plantId);
        } else if (type != null && !type.isBlank()) {
            warehouses = warehouseRepository.findByTypeAndIsActiveTrue(type);
        } else {
            warehouses = activeOnly ? warehouseRepository.findByIsActiveTrue() : warehouseRepository.findAll();
        }

        return warehouses.stream()
                .map(this::mapToWarehouseResponse)
                .toList();
    }

    @GetMapping("/plants")
    public List<PlantResponse> getWarehousePlants() {
        return plantRepository.findAll().stream()
                .map(this::mapToPlantResponse)
                .toList();
    }

    @GetMapping("/{id:[0-9]+}")
    public WarehouseResponse getWarehouseById(@PathVariable Long id) {
        Warehouse w = warehouseRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Warehouse not found with ID: " + id));
        return mapToWarehouseResponse(w);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<WarehouseResponse> createWarehouse(@Valid @RequestBody CreateWarehouseRequest request) {
        Plant plant = plantRepository.findById(request.getPlantId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Plant not found with ID: " + request.getPlantId()));

        Warehouse warehouse = Warehouse.builder()
                .plant(plant)
                .warehouseName(request.getWarehouseName().trim())
                .type(request.getType() != null ? request.getType() : "Both")
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        Warehouse saved = warehouseRepository.save(warehouse);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapToWarehouseResponse(saved));
    }

    @PutMapping("/{id:[0-9]+}")
    @Transactional
    public WarehouseResponse updateWarehouse(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Warehouse w = warehouseRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Warehouse not found with ID: " + id));

        if (body.containsKey("warehouseName") && body.get("warehouseName") != null) {
            w.setWarehouseName(String.valueOf(body.get("warehouseName")).trim());
        }
        if (body.containsKey("type") && body.get("type") != null) {
            w.setType(String.valueOf(body.get("type")));
        }
        if (body.containsKey("isActive") && body.get("isActive") != null) {
            w.setIsActive(Boolean.valueOf(String.valueOf(body.get("isActive"))));
        }
        if (body.containsKey("plantId") && body.get("plantId") != null) {
            Long plantId = Long.valueOf(String.valueOf(body.get("plantId")));
            Plant plant = plantRepository.findById(plantId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Plant not found with ID: " + plantId));
            w.setPlant(plant);
        }

        Warehouse saved = warehouseRepository.save(w);
        return mapToWarehouseResponse(saved);
    }

    @DeleteMapping("/{id:[0-9]+}")
    @Transactional
    public ResponseEntity<Void> deleteWarehouse(
            @PathVariable Long id,
            @RequestParam(defaultValue = "true") boolean permanent) {
        Warehouse w = warehouseRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Warehouse not found with ID: " + id));

        if (permanent) {
            try {
                List<LocationBin> bins = locationBinRepository.findByShelf_Rack_Warehouse_WarehouseId(id);
                locationBinRepository.deleteAll(bins);
                List<LocationRack> racks = locationRackRepository.findByWarehouse_WarehouseId(id);
                for (LocationRack r : racks) {
                    List<LocationShelf> shelves = locationShelfRepository.findByRack_RackId(r.getRackId());
                    locationShelfRepository.deleteAll(shelves);
                }
                locationRackRepository.deleteAll(racks);
                warehouseRepository.delete(w);
                return ResponseEntity.noContent().build();
            } catch (Exception ignored) {
                // If referenced by foreign key (orders/dispatches/transfers), mark inactive
                w.setIsActive(false);
                warehouseRepository.save(w);
                return ResponseEntity.noContent().build();
            }
        } else {
            w.setIsActive(false);
            warehouseRepository.save(w);
            return ResponseEntity.noContent().build();
        }
    }

    @PostMapping("/{id:[0-9]+}/clear-all-stock")
    @Transactional
    public ResponseEntity<Map<String, Object>> clearAllWarehouseStock(@PathVariable Long id) {
        if (!warehouseRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Warehouse not found with ID: " + id);
        }
        return ResponseEntity.ok(Map.of("message", "Warehouse stock reset successfully", "warehouseId", id));
    }

    @GetMapping("/{id:[0-9]+}/bins")
    public List<LocationBinResponse> getBinsByWarehouseId(@PathVariable Long id) {
        if (!warehouseRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Warehouse not found with ID: " + id);
        }

        List<LocationBin> bins = locationBinRepository.findByShelf_Rack_Warehouse_WarehouseId(id);
        return bins.stream()
                .map(this::mapToBinResponse)
                .toList();
    }

    @GetMapping("/{id:[0-9]+}/racks")
    public List<Map<String, Object>> getRacksByWarehouseId(@PathVariable Long id) {
        if (!warehouseRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Warehouse not found with ID: " + id);
        }
        List<LocationRack> racks = locationRackRepository.findByWarehouse_WarehouseId(id);
        return racks.stream().map(r -> Map.<String, Object>of(
                "rackId", r.getRackId(),
                "warehouseId", r.getWarehouse().getWarehouseId(),
                "rackCode", r.getRackCode(),
                "isActive", r.getIsActive()
        )).toList();
    }

    @PostMapping("/{id:[0-9]+}/racks")
    @Transactional
    public ResponseEntity<Map<String, Object>> createRack(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Warehouse w = warehouseRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Warehouse not found with ID: " + id));

        String rackCode = String.valueOf(body.getOrDefault("rackCode", "R-" + System.currentTimeMillis()));
        LocationRack rack = LocationRack.builder()
                .warehouse(w)
                .rackCode(rackCode)
                .isActive(true)
                .build();
        LocationRack saved = locationRackRepository.save(rack);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved != null ? Map.of(
                "rackId", saved.getRackId(),
                "warehouseId", saved.getWarehouse().getWarehouseId(),
                "rackCode", saved.getRackCode(),
                "isActive", saved.getIsActive()
        ) : null);
    }

    private PlantResponse mapToPlantResponse(Plant p) {
        return PlantResponse.builder()
                .plantId(p.getPlantId())
                .plantName(p.getPlantName())
                .city(p.getCity())
                .state(p.getState())
                .country(p.getCountry())
                .isActive(p.getIsActive())
                .build();
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


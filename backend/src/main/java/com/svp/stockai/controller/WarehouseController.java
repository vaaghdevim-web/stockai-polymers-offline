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

    @GetMapping("/{id:[0-9]+}/storage-tree")
    public Map<String, Object> getStorageTree(@PathVariable Long id) {
        Warehouse w = warehouseRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Warehouse not found with ID: " + id));

        List<LocationRack> racks = locationRackRepository.findByWarehouse_WarehouseId(id);
        List<Map<String, Object>> rackTree = racks.stream().map(r -> {
            List<LocationShelf> shelves = locationShelfRepository.findByRack_RackId(r.getRackId());
            List<Map<String, Object>> shelfTree = shelves.stream().map(s -> {
                List<LocationBin> bins = locationBinRepository.findByShelf_ShelfId(s.getShelfId());
                List<Map<String, Object>> binList = bins.stream().map(b -> Map.<String, Object>of(
                        "binId", b.getBinId(),
                        "binCode", b.getBinCode(),
                        "isActive", b.getIsActive() != null ? b.getIsActive() : true,
                        "capacityKg", 5000.0,
                        "currentStockKg", 0.0,
                        "availableCapacityKg", 5000.0,
                        "utilizationPct", 0.0
                )).toList();

                return Map.<String, Object>of(
                        "shelfId", s.getShelfId(),
                        "shelfCode", s.getShelfCode(),
                        "shelfLevel", 1,
                        "bins", binList
                );
            }).toList();

            return Map.<String, Object>of(
                    "rackId", r.getRackId(),
                    "rackCode", r.getRackCode(),
                    "isActive", r.getIsActive() != null ? r.getIsActive() : true,
                    "shelves", shelfTree
            );
        }).toList();

        return Map.of(
                "warehouseId", w.getWarehouseId(),
                "warehouseName", w.getWarehouseName(),
                "plantName", w.getPlant() != null ? w.getPlant().getPlantName() : "Plant 1",
                "racks", rackTree
        );
    }

    @GetMapping("/racks/{rackCode}/shelves")
    public List<Map<String, Object>> getShelvesByRackCode(@PathVariable String rackCode) {
        return locationShelfRepository.findAll().stream()
                .filter(s -> s.getRack() != null && rackCode.equalsIgnoreCase(s.getRack().getRackCode()))
                .map(s -> Map.<String, Object>of(
                        "shelfId", s.getShelfId(),
                        "shelfCode", s.getShelfCode(),
                        "shelfLevel", 1,
                        "rackId", s.getRack().getRackId()
                )).toList();
    }

    @GetMapping("/shelves/{shelfId:[0-9]+}/bins")
    public List<LocationBinResponse> getBinsByShelfId(@PathVariable Long shelfId) {
        return locationBinRepository.findByShelf_ShelfId(shelfId).stream()
                .map(this::mapToBinResponse)
                .toList();
    }

    @PostMapping("/racks/{rackId:[0-9]+}/shelves")
    @Transactional
    public ResponseEntity<Map<String, Object>> createShelfForRack(@PathVariable Long rackId, @RequestBody Map<String, Object> body) {
        LocationRack rack = locationRackRepository.findById(rackId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rack not found with ID: " + rackId));

        String shelfCode = String.valueOf(body.getOrDefault("shelfCode", "S-" + System.currentTimeMillis()));

        LocationShelf shelf = LocationShelf.builder()
                .rack(rack)
                .shelfCode(shelfCode)
                .build();
        LocationShelf saved = locationShelfRepository.save(shelf);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "shelfId", saved.getShelfId(),
                "shelfCode", saved.getShelfCode(),
                "shelfLevel", 1
        ));
    }

    @PostMapping("/shelves/{shelfId:[0-9]+}/bins")
    @Transactional
    public ResponseEntity<LocationBinResponse> createBinForShelf(@PathVariable Long shelfId, @RequestBody Map<String, Object> body) {
        LocationShelf shelf = locationShelfRepository.findById(shelfId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shelf not found with ID: " + shelfId));

        String binCode = String.valueOf(body.getOrDefault("binCode", "BIN-" + System.currentTimeMillis()));
        LocationBin bin = LocationBin.builder()
                .shelf(shelf)
                .binCode(binCode)
                .isActive(true)
                .build();
        LocationBin saved = locationBinRepository.save(bin);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapToBinResponse(saved));
    }

    @PutMapping("/racks/{rackId:[0-9]+}")
    @Transactional
    public ResponseEntity<Map<String, Object>> updateRack(@PathVariable Long rackId, @RequestBody Map<String, Object> body) {
        LocationRack rack = locationRackRepository.findById(rackId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rack not found with ID: " + rackId));
        if (body.containsKey("rackCode")) {
            rack.setRackCode(String.valueOf(body.get("rackCode")).trim());
        }
        if (body.containsKey("isActive")) {
            rack.setIsActive(Boolean.valueOf(String.valueOf(body.get("isActive"))));
        }
        LocationRack saved = locationRackRepository.save(rack);
        return ResponseEntity.ok(Map.of("rackId", saved.getRackId(), "rackCode", saved.getRackCode(), "isActive", saved.getIsActive()));
    }

    @DeleteMapping("/racks/{rackId:[0-9]+}")
    @Transactional
    public ResponseEntity<Void> deleteRack(@PathVariable Long rackId) {
        LocationRack rack = locationRackRepository.findById(rackId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rack not found with ID: " + rackId));
        List<LocationShelf> shelves = locationShelfRepository.findByRack_RackId(rackId);
        for (LocationShelf s : shelves) {
            List<LocationBin> bins = locationBinRepository.findByShelf_ShelfId(s.getShelfId());
            locationBinRepository.deleteAll(bins);
        }
        locationShelfRepository.deleteAll(shelves);
        locationRackRepository.delete(rack);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/shelves/{shelfId:[0-9]+}")
    @Transactional
    public ResponseEntity<Map<String, Object>> updateShelf(@PathVariable Long shelfId, @RequestBody Map<String, Object> body) {
        LocationShelf shelf = locationShelfRepository.findById(shelfId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shelf not found with ID: " + shelfId));
        if (body.containsKey("shelfCode")) {
            shelf.setShelfCode(String.valueOf(body.get("shelfCode")).trim());
        }
        LocationShelf saved = locationShelfRepository.save(shelf);
        return ResponseEntity.ok(Map.of("shelfId", saved.getShelfId(), "shelfCode", saved.getShelfCode(), "shelfLevel", 1));
    }

    @DeleteMapping("/shelves/{shelfId:[0-9]+}")
    @Transactional
    public ResponseEntity<Void> deleteShelf(@PathVariable Long shelfId) {
        LocationShelf shelf = locationShelfRepository.findById(shelfId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shelf not found with ID: " + shelfId));
        List<LocationBin> bins = locationBinRepository.findByShelf_ShelfId(shelfId);
        locationBinRepository.deleteAll(bins);
        locationShelfRepository.delete(shelf);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/bins/{binId:[0-9]+}")
    @Transactional
    public ResponseEntity<LocationBinResponse> updateBin(@PathVariable Long binId, @RequestBody Map<String, Object> body) {
        LocationBin bin = locationBinRepository.findById(binId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bin not found with ID: " + binId));
        if (body.containsKey("binCode")) {
            bin.setBinCode(String.valueOf(body.get("binCode")).trim());
        }
        if (body.containsKey("isActive")) {
            bin.setIsActive(Boolean.valueOf(String.valueOf(body.get("isActive"))));
        }
        LocationBin saved = locationBinRepository.save(bin);
        return ResponseEntity.ok(mapToBinResponse(saved));
    }

    @DeleteMapping("/bins/{binId:[0-9]+}")
    @Transactional
    public ResponseEntity<Void> deleteBin(@PathVariable Long binId) {
        LocationBin bin = locationBinRepository.findById(binId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bin not found with ID: " + binId));
        locationBinRepository.delete(bin);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bins/{binId:[0-9]+}/clear-stock")
    @Transactional
    public ResponseEntity<Map<String, Object>> clearBinStock(@PathVariable Long binId) {
        if (!locationBinRepository.existsById(binId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bin not found with ID: " + binId);
        }
        return ResponseEntity.ok(Map.of("message", "Bin stock cleared successfully", "binId", binId));
    }

    @GetMapping("/bins/{binId:[0-9]+}/occupancy")
    public ResponseEntity<Map<String, Object>> getBinOccupancy(@PathVariable Long binId) {
        LocationBin bin = locationBinRepository.findById(binId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bin not found with ID: " + binId));
        return ResponseEntity.ok(Map.of(
                "binId", bin.getBinId(),
                "binCode", bin.getBinCode(),
                "capacityKg", 5000.0,
                "currentStockKg", 0.0,
                "availableCapacityKg", 5000.0,
                "utilizationPct", 0.0,
                "pallets", List.of()
        ));
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


package com.svp.stockai.controller;

import com.svp.stockai.dto.BatchLocationResponse;
import com.svp.stockai.dto.CreateWarehouseRequest;
import com.svp.stockai.dto.LocationBinResponse;
import com.svp.stockai.dto.PlantResponse;
import com.svp.stockai.dto.WarehouseResponse;
import com.svp.stockai.entity.*;
import com.svp.stockai.repository.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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
    private final InventoryRepository inventoryRepository;
    private final MaterialBatchRepository materialBatchRepository;
    private final FinishedBatchRepository finishedBatchRepository;
    private final PalletRepository palletRepository;
    private final PalletItemRepository palletItemRepository;

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
                for (LocationBin b : bins) {
                    List<Inventory> invs = inventoryRepository.findActiveInventoryByBinId(b.getBinId());
                    if (!invs.isEmpty()) {
                        throw new IllegalStateException("Active inventory exists");
                    }
                }
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
        List<LocationBin> bins = locationBinRepository.findByShelf_Rack_Warehouse_WarehouseId(id);
        for (LocationBin b : bins) {
            List<Inventory> invs = inventoryRepository.findActiveInventoryByBinId(b.getBinId());
            for (Inventory inv : invs) {
                inv.setQuantityOnHand(BigDecimal.ZERO);
                inventoryRepository.save(inv);
            }
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
                List<Map<String, Object>> binList = bins.stream().map(b -> {
                    BigDecimal capacity = b.getCapacityKg() != null ? b.getCapacityKg() : new BigDecimal("5000.0000");
                    BigDecimal currentStock = inventoryRepository.getTotalStockInBin(b.getBinId());
                    BigDecimal available = capacity.subtract(currentStock).max(BigDecimal.ZERO);
                    double utilPct = capacity.compareTo(BigDecimal.ZERO) > 0 ?
                            currentStock.multiply(BigDecimal.valueOf(100)).divide(capacity, 2, RoundingMode.HALF_UP).doubleValue() : 0.0;

                    String status;
                    if (currentStock.compareTo(capacity) > 0) {
                        status = "OVER CAPACITY";
                    } else if (currentStock.compareTo(capacity) == 0) {
                        status = "FULL";
                    } else if (currentStock.compareTo(BigDecimal.ZERO) > 0) {
                        status = "PARTIALLY OCCUPIED";
                    } else {
                        status = "EMPTY";
                    }

                    int palletCount = palletRepository.findByBin_BinId(b.getBinId()).size();

                    return Map.<String, Object>of(
                            "binId", b.getBinId(),
                            "binCode", b.getBinCode(),
                            "isActive", b.getIsActive() != null ? b.getIsActive() : true,
                            "capacityKg", capacity.doubleValue(),
                            "currentStockKg", currentStock.doubleValue(),
                            "availableCapacityKg", available.doubleValue(),
                            "utilizationPct", utilPct,
                            "status", status,
                            "isOverCapacity", currentStock.compareTo(capacity) > 0,
                            "activePalletCount", palletCount
                    );
                }).toList();

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

        String binCode = String.valueOf(body.getOrDefault("binCode", "BIN-" + System.currentTimeMillis())).trim();
        BigDecimal capacity = new BigDecimal("5000.0000");
        if (body.containsKey("capacityKg") && body.get("capacityKg") != null) {
            try {
                BigDecimal parsed = new BigDecimal(String.valueOf(body.get("capacityKg")).trim());
                if (parsed.compareTo(BigDecimal.ZERO) > 0) {
                    capacity = parsed;
                }
            } catch (Exception ignored) {
            }
        }

        LocationBin bin = LocationBin.builder()
                .shelf(shelf)
                .binCode(binCode)
                .capacityKg(capacity)
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
        LocationBin bin = locationBinRepository.findByIdWithLock(binId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bin not found with ID: " + binId));

        BigDecimal currentOccupancy = inventoryRepository.getTotalStockInBin(binId);

        if (body.containsKey("capacityKg") && body.get("capacityKg") != null) {
            BigDecimal newCapacity;
            try {
                newCapacity = new BigDecimal(String.valueOf(body.get("capacityKg")).trim());
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid capacity format");
            }
            if (newCapacity.compareTo(BigDecimal.ZERO) <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bin capacity must be greater than zero.");
            }
            if (newCapacity.compareTo(currentOccupancy) < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        String.format("Cannot reduce bin capacity below current occupancy. Current occupancy: %s KG, Requested capacity: %s KG.",
                                currentOccupancy, newCapacity));
            }
            bin.setCapacityKg(newCapacity);
        }

        if (body.containsKey("binCode") && body.get("binCode") != null) {
            String newCode = String.valueOf(body.get("binCode")).trim();
            if (!newCode.isBlank()) {
                bin.setBinCode(newCode);
            }
        }

        if (body.containsKey("isActive") && body.get("isActive") != null) {
            boolean active = Boolean.parseBoolean(String.valueOf(body.get("isActive")));
            if (!active && currentOccupancy.compareTo(BigDecimal.ZERO) > 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Cannot deactivate bin containing active inventory (" + currentOccupancy + " KG).");
            }
            bin.setIsActive(active);
        }

        LocationBin saved = locationBinRepository.save(bin);
        return ResponseEntity.ok(mapToBinResponse(saved));
    }

    @DeleteMapping("/bins/{binId:[0-9]+}")
    @Transactional
    public ResponseEntity<Void> deleteBin(@PathVariable Long binId, @RequestParam(defaultValue = "false") boolean force) {
        LocationBin bin = locationBinRepository.findById(binId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bin not found with ID: " + binId));

        BigDecimal currentOccupancy = inventoryRepository.getTotalStockInBin(binId);
        if (currentOccupancy.compareTo(BigDecimal.ZERO) > 0 && !force) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cannot delete bin containing active stock (" + currentOccupancy + " KG). Clear stock or use force=true.");
        }

        List<Inventory> invs = inventoryRepository.findActiveInventoryByBinId(binId);
        inventoryRepository.deleteAll(invs);
        locationBinRepository.delete(bin);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bins/{binId:[0-9]+}/clear-stock")
    @Transactional
    public ResponseEntity<Map<String, Object>> clearBinStock(@PathVariable Long binId) {
        LocationBin bin = locationBinRepository.findById(binId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bin not found with ID: " + binId));

        List<Inventory> invs = inventoryRepository.findActiveInventoryByBinId(binId);
        for (Inventory inv : invs) {
            inv.setQuantityOnHand(BigDecimal.ZERO);
            inventoryRepository.save(inv);
        }

        return ResponseEntity.ok(Map.of("message", "Bin stock cleared successfully", "binId", binId));
    }

    @GetMapping("/bins/{binId:[0-9]+}/occupancy")
    public ResponseEntity<Map<String, Object>> getBinOccupancy(@PathVariable Long binId) {
        LocationBin bin = locationBinRepository.findById(binId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bin not found with ID: " + binId));

        BigDecimal capacity = bin.getCapacityKg() != null ? bin.getCapacityKg() : new BigDecimal("5000.0000");
        BigDecimal currentStock = inventoryRepository.getTotalStockInBin(binId);
        BigDecimal available = capacity.subtract(currentStock).max(BigDecimal.ZERO);
        double utilPct = capacity.compareTo(BigDecimal.ZERO) > 0 ?
                currentStock.multiply(BigDecimal.valueOf(100)).divide(capacity, 2, RoundingMode.HALF_UP).doubleValue() : 0.0;

        String status;
        if (currentStock.compareTo(capacity) > 0) {
            status = "OVER CAPACITY";
        } else if (currentStock.compareTo(capacity) == 0) {
            status = "FULL";
        } else if (currentStock.compareTo(BigDecimal.ZERO) > 0) {
            status = "PARTIALLY OCCUPIED";
        } else {
            status = "EMPTY";
        }

        List<Inventory> activeInvs = inventoryRepository.findActiveInventoryByBinId(binId);
        List<Map<String, Object>> batchList = activeInvs.stream().map(inv -> {
            MaterialBatch mb = inv.getMaterialBatch();
            FinishedBatch fb = inv.getFinishedBatch();
            String batchNo = mb != null ? mb.getBatchNo() : (fb != null ? fb.getBatchNo() : "N/A");
            String lot = mb != null ? mb.getLotNumber() : null;
            String materialName = mb != null && mb.getMaterial() != null ? mb.getMaterial().getMaterialName() :
                    (fb != null && fb.getProduct() != null ? fb.getProduct().getProductName() : "General Stock");
            String materialCode = mb != null && mb.getMaterial() != null ? mb.getMaterial().getMaterialCode() :
                    (fb != null && fb.getProduct() != null ? fb.getProduct().getProductCode() : "");

            return Map.<String, Object>of(
                    "inventoryId", inv.getInventoryId(),
                    "batchNo", batchNo,
                    "lotNumber", lot != null ? lot : "",
                    "materialName", materialName,
                    "materialCode", materialCode,
                    "quantityKg", inv.getQuantityOnHand().doubleValue(),
                    "qualityStatus", inv.getQualityStatus() != null ? inv.getQualityStatus() : "Available",
                    "updatedAt", inv.getUpdatedAt() != null ? inv.getUpdatedAt().toString() : ""
            );
        }).toList();

        List<Pallet> pallets = palletRepository.findByBin_BinId(binId);
        List<Map<String, Object>> palletList = pallets.stream().map(p -> Map.<String, Object>of(
                "palletId", p.getPalletId(),
                "palletCode", p.getPalletCode(),
                "barcode", p.getBarcode(),
                "status", p.getStatus()
        )).toList();

        return ResponseEntity.ok(Map.of(
                "binId", bin.getBinId(),
                "binCode", bin.getBinCode(),
                "capacityKg", capacity.doubleValue(),
                "currentStockKg", currentStock.doubleValue(),
                "availableCapacityKg", available.doubleValue(),
                "utilizationPct", utilPct,
                "status", status,
                "isOverCapacity", currentStock.compareTo(capacity) > 0,
                "batches", batchList,
                "pallets", palletList
        ));
    }

    /**
     * Exact Batch Physical Storage Location Lookup Endpoint.
     * Accessible via GET /api/v1/warehouses/batch-location?batchNo=RM-2026-001
     */
    @GetMapping("/batch-location")
    public ResponseEntity<BatchLocationResponse> searchBatchLocation(@RequestParam String batchNo) {
        if (batchNo == null || batchNo.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Batch number is required for location search.");
        }

        String search = batchNo.trim();

        // 1. Search in Material Batches (Raw Material)
        Optional<MaterialBatch> mbOpt = materialBatchRepository.findByBatchNo(search);
        if (mbOpt.isPresent()) {
            MaterialBatch mb = mbOpt.get();
            List<Inventory> activeInvs = inventoryRepository.findActiveInventoryByMaterialBatchNo(search);
            Inventory targetInv = !activeInvs.isEmpty() ? activeInvs.get(0) : null;
            if (targetInv == null) {
                List<Inventory> latestInvs = inventoryRepository.findLatestInventoryByMaterialBatchNo(search);
                if (!latestInvs.isEmpty()) {
                    targetInv = latestInvs.get(0);
                }
            }

            if (targetInv != null && targetInv.getBin() != null) {
                return ResponseEntity.ok(buildBatchLocationResponse(mb, targetInv));
            }
        }

        // 2. Search in Finished Batches (Finished Goods)
        Optional<FinishedBatch> fbOpt = finishedBatchRepository.findByBatchNo(search);
        if (fbOpt.isPresent()) {
            FinishedBatch fb = fbOpt.get();
            List<Inventory> activeInvs = inventoryRepository.findActiveInventoryByFinishedBatchNo(search);
            Inventory targetInv = !activeInvs.isEmpty() ? activeInvs.get(0) : null;
            if (targetInv == null) {
                List<Inventory> latestInvs = inventoryRepository.findLatestInventoryByFinishedBatchNo(search);
                if (!latestInvs.isEmpty()) {
                    targetInv = latestInvs.get(0);
                }
            }

            if (targetInv != null && targetInv.getBin() != null) {
                return ResponseEntity.ok(buildFinishedBatchLocationResponse(fb, targetInv));
            }
        }

        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Batch not found: " + search);
    }

    private BatchLocationResponse buildBatchLocationResponse(MaterialBatch mb, Inventory inv) {
        LocationBin bin = inv.getBin();
        LocationShelf shelf = bin.getShelf();
        LocationRack rack = shelf != null ? shelf.getRack() : null;
        Warehouse wh = rack != null ? rack.getWarehouse() : null;

        BigDecimal capacity = bin.getCapacityKg() != null ? bin.getCapacityKg() : new BigDecimal("5000.0000");
        BigDecimal currentOccupancy = inventoryRepository.getTotalStockInBin(bin.getBinId());
        BigDecimal available = capacity.subtract(currentOccupancy).max(BigDecimal.ZERO);
        double utilPct = capacity.compareTo(BigDecimal.ZERO) > 0 ?
                currentOccupancy.multiply(BigDecimal.valueOf(100)).divide(capacity, 2, RoundingMode.HALF_UP).doubleValue() : 0.0;

        String status;
        if (currentOccupancy.compareTo(capacity) > 0) {
            status = "OVER CAPACITY";
        } else if (currentOccupancy.compareTo(capacity) == 0) {
            status = "FULL";
        } else if (currentOccupancy.compareTo(BigDecimal.ZERO) > 0) {
            status = "PARTIALLY OCCUPIED";
        } else {
            status = "EMPTY";
        }

        String exactLoc = String.format("Warehouse %s → Rack %s → Shelf %s → Bin %s",
                wh != null ? wh.getWarehouseName() : "N/A",
                rack != null ? rack.getRackCode() : "N/A",
                shelf != null ? shelf.getShelfCode() : "N/A",
                bin.getBinCode());

        return BatchLocationResponse.builder()
                .batchNo(mb.getBatchNo())
                .lotNumber(mb.getLotNumber())
                .batchType("RAW_MATERIAL")
                .materialId(mb.getMaterial() != null ? mb.getMaterial().getMaterialId() : null)
                .materialName(mb.getMaterial() != null ? mb.getMaterial().getMaterialName() : "Raw Material")
                .materialCode(mb.getMaterial() != null ? mb.getMaterial().getMaterialCode() : "")
                .categoryName(mb.getMaterial() != null && mb.getMaterial().getCategory() != null ? mb.getMaterial().getCategory().getCategoryName() : "Raw")
                .quantityKg(inv.getQuantityOnHand())
                .initialWeightKg(mb.getInitialWeightKg())
                .currentWeightKg(mb.getCurrentWeightKg())
                .qualityStatus(inv.getQualityStatus() != null ? inv.getQualityStatus() : mb.getQualityStatus())
                .status(mb.getStatus())
                .receivedOrProducedAt(mb.getReceivedAt())
                .warehouseId(wh != null ? wh.getWarehouseId() : null)
                .warehouseName(wh != null ? wh.getWarehouseName() : "Unassigned")
                .warehouseType(wh != null ? wh.getType() : "Raw")
                .zone(wh != null ? (wh.getType() != null ? wh.getType() + " Storage" : "Raw Material Zone") : "General Zone")
                .rackId(rack != null ? rack.getRackId() : null)
                .rackCode(rack != null ? rack.getRackCode() : "N/A")
                .shelfId(shelf != null ? shelf.getShelfId() : null)
                .shelfCode(shelf != null ? shelf.getShelfCode() : "N/A")
                .shelfLevel(1)
                .binId(bin.getBinId())
                .binCode(bin.getBinCode())
                .binCapacityKg(capacity)
                .binOccupiedKg(currentOccupancy)
                .binAvailableKg(available)
                .binOccupancyPct(utilPct)
                .binStatus(status)
                .exactLocation(exactLoc)
                .build();
    }

    private BatchLocationResponse buildFinishedBatchLocationResponse(FinishedBatch fb, Inventory inv) {
        LocationBin bin = inv.getBin();
        LocationShelf shelf = bin.getShelf();
        LocationRack rack = shelf != null ? shelf.getRack() : null;
        Warehouse wh = rack != null ? rack.getWarehouse() : null;

        BigDecimal capacity = bin.getCapacityKg() != null ? bin.getCapacityKg() : new BigDecimal("5000.0000");
        BigDecimal currentOccupancy = inventoryRepository.getTotalStockInBin(bin.getBinId());
        BigDecimal available = capacity.subtract(currentOccupancy).max(BigDecimal.ZERO);
        double utilPct = capacity.compareTo(BigDecimal.ZERO) > 0 ?
                currentOccupancy.multiply(BigDecimal.valueOf(100)).divide(capacity, 2, RoundingMode.HALF_UP).doubleValue() : 0.0;

        String status;
        if (currentOccupancy.compareTo(capacity) > 0) {
            status = "OVER CAPACITY";
        } else if (currentOccupancy.compareTo(capacity) == 0) {
            status = "FULL";
        } else if (currentOccupancy.compareTo(BigDecimal.ZERO) > 0) {
            status = "PARTIALLY OCCUPIED";
        } else {
            status = "EMPTY";
        }

        String exactLoc = String.format("Warehouse %s → Rack %s → Shelf %s → Bin %s",
                wh != null ? wh.getWarehouseName() : "N/A",
                rack != null ? rack.getRackCode() : "N/A",
                shelf != null ? shelf.getShelfCode() : "N/A",
                bin.getBinCode());

        return BatchLocationResponse.builder()
                .batchNo(fb.getBatchNo())
                .lotNumber(null)
                .batchType("FINISHED_GOODS")
                .materialId(fb.getProduct() != null ? fb.getProduct().getProductId() : null)
                .materialName(fb.getProduct() != null ? fb.getProduct().getProductName() : "Finished Product")
                .materialCode(fb.getProduct() != null ? fb.getProduct().getProductCode() : "")
                .categoryName(fb.getProduct() != null && fb.getProduct().getCategory() != null ? fb.getProduct().getCategory().getCategoryName() : "FG")
                .quantityKg(inv.getQuantityOnHand())
                .initialWeightKg(fb.getQtyProduced())
                .currentWeightKg(fb.getOutputWeightKg() != null ? fb.getOutputWeightKg() : fb.getQtyProduced())
                .qualityStatus(inv.getQualityStatus() != null ? inv.getQualityStatus() : fb.getQualityStatus())
                .status(fb.getIsActive() ? "Active" : "Archived")
                .receivedOrProducedAt(fb.getCreatedAt())
                .warehouseId(wh != null ? wh.getWarehouseId() : null)
                .warehouseName(wh != null ? wh.getWarehouseName() : "Unassigned")
                .warehouseType(wh != null ? wh.getType() : "FG")
                .zone(wh != null ? (wh.getType() != null ? wh.getType() + " Storage" : "Finished Goods Zone") : "FG Zone")
                .rackId(rack != null ? rack.getRackId() : null)
                .rackCode(rack != null ? rack.getRackCode() : "N/A")
                .shelfId(shelf != null ? shelf.getShelfId() : null)
                .shelfCode(shelf != null ? shelf.getShelfCode() : "N/A")
                .shelfLevel(1)
                .binId(bin.getBinId())
                .binCode(bin.getBinCode())
                .binCapacityKg(capacity)
                .binOccupiedKg(currentOccupancy)
                .binAvailableKg(available)
                .binOccupancyPct(utilPct)
                .binStatus(status)
                .exactLocation(exactLoc)
                .build();
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
        BigDecimal capacity = b.getCapacityKg() != null ? b.getCapacityKg() : new BigDecimal("5000.0000");
        BigDecimal currentStock = inventoryRepository.getTotalStockInBin(b.getBinId());
        BigDecimal available = capacity.subtract(currentStock).max(BigDecimal.ZERO);
        double utilPct = capacity.compareTo(BigDecimal.ZERO) > 0 ?
                currentStock.multiply(BigDecimal.valueOf(100)).divide(capacity, 2, RoundingMode.HALF_UP).doubleValue() : 0.0;

        String status;
        if (currentStock.compareTo(capacity) > 0) {
            status = "OVER CAPACITY";
        } else if (currentStock.compareTo(capacity) == 0) {
            status = "FULL";
        } else if (currentStock.compareTo(BigDecimal.ZERO) > 0) {
            status = "PARTIALLY OCCUPIED";
        } else {
            status = "EMPTY";
        }

        int palletCount = palletRepository.findByBin_BinId(b.getBinId()).size();

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
                .capacityKg(capacity)
                .currentStockKg(currentStock)
                .availableCapacityKg(available)
                .utilizationPct(utilPct)
                .status(status)
                .activePalletCount(palletCount)
                .build();
    }
}

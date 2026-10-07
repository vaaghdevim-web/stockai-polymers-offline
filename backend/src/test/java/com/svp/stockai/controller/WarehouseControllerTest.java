package com.svp.stockai.controller;

import com.svp.stockai.entity.Inventory;
import com.svp.stockai.entity.LocationBin;
import com.svp.stockai.entity.LocationRack;
import com.svp.stockai.entity.LocationShelf;
import com.svp.stockai.entity.MaterialBatch;
import com.svp.stockai.entity.RawMaterial;
import com.svp.stockai.entity.Warehouse;
import com.svp.stockai.repository.FinishedBatchRepository;
import com.svp.stockai.repository.InventoryRepository;
import com.svp.stockai.repository.LocationBinRepository;
import com.svp.stockai.repository.LocationRackRepository;
import com.svp.stockai.repository.LocationShelfRepository;
import com.svp.stockai.repository.MaterialBatchRepository;
import com.svp.stockai.repository.PalletItemRepository;
import com.svp.stockai.repository.PalletRepository;
import com.svp.stockai.repository.PlantRepository;
import com.svp.stockai.repository.WarehouseRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(WarehouseController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class WarehouseControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private WarehouseRepository warehouseRepository;

    @MockitoBean
    private LocationRackRepository rackRepository;

    @MockitoBean
    private LocationShelfRepository shelfRepository;

    @MockitoBean
    private LocationBinRepository binRepository;

    @MockitoBean
    private PlantRepository plantRepository;

    @MockitoBean
    private InventoryRepository inventoryRepository;

    @MockitoBean
    private MaterialBatchRepository materialBatchRepository;

    @MockitoBean
    private FinishedBatchRepository finishedBatchRepository;

    @MockitoBean
    private PalletRepository palletRepository;

    @MockitoBean
    private PalletItemRepository palletItemRepository;

    private LocationBin mockBinHierarchy() {
        Warehouse wh = Warehouse.builder().warehouseId(1L).warehouseName("Unit 1 RM WH").isActive(true).build();
        LocationRack rack = LocationRack.builder().rackId(2L).rackCode("R-01").warehouse(wh).isActive(true).build();
        LocationShelf shelf = LocationShelf.builder().shelfId(3L).shelfCode("S-01").rack(rack).isActive(true).build();
        return LocationBin.builder()
                .binId(4L)
                .binCode("BIN-U1-01")
                .shelf(shelf)
                .capacityKg(new BigDecimal("5000.0000"))
                .isActive(true)
                .build();
    }

    @Test
    void batchLocationSearchReturnsFullHierarchyForRawMaterialBatch() throws Exception {
        LocationBin bin = mockBinHierarchy();
        RawMaterial rm = RawMaterial.builder().materialId(10L).materialName("Polymer Resin").materialCode("RM-PP-01").build();
        MaterialBatch batch = MaterialBatch.builder().batchId(100L).batchNo("RM-2026-00125").material(rm).currentWeightKg(new BigDecimal("4500.0000")).qualityStatus("Available").build();
        Inventory inv = Inventory.builder().inventoryId(1000L).bin(bin).materialBatch(batch).quantityOnHand(new BigDecimal("4500.0000")).qualityStatus("Available").build();

        when(materialBatchRepository.findByBatchNo("RM-2026-00125")).thenReturn(Optional.of(batch));
        when(inventoryRepository.findActiveInventoryByMaterialBatchNo("RM-2026-00125")).thenReturn(List.of(inv));
        when(inventoryRepository.getTotalStockInBin(4L)).thenReturn(new BigDecimal("4500.0000"));

        mockMvc.perform(get("/api/v1/warehouses/batch-location")
                        .param("batchNo", "RM-2026-00125"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.batchNo").value("RM-2026-00125"))
                .andExpect(jsonPath("$.materialName").value("Polymer Resin"))
                .andExpect(jsonPath("$.quantityKg").value(4500.0))
                .andExpect(jsonPath("$.warehouseName").value("Unit 1 RM WH"))
                .andExpect(jsonPath("$.rackCode").value("R-01"))
                .andExpect(jsonPath("$.shelfCode").value("S-01"))
                .andExpect(jsonPath("$.binCode").value("BIN-U1-01"))
                .andExpect(jsonPath("$.binCapacityKg").value(5000.0))
                .andExpect(jsonPath("$.binOccupiedKg").value(4500.0))
                .andExpect(jsonPath("$.binAvailableKg").value(500.0))
                .andExpect(jsonPath("$.binStatus").value("PARTIALLY OCCUPIED"));
    }

    @Test
    void batchLocationSearchReturnsNotFoundWhenBatchDoesNotExist() throws Exception {
        when(materialBatchRepository.findByBatchNo("NON-EXISTENT")).thenReturn(Optional.empty());
        when(finishedBatchRepository.findByBatchNo("NON-EXISTENT")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/warehouses/batch-location")
                        .param("batchNo", "NON-EXISTENT"))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateBinCapacityAllowsValidCapacityIncrease() throws Exception {
        LocationBin bin = mockBinHierarchy();
        when(binRepository.findByIdWithLock(4L)).thenReturn(Optional.of(bin));
        when(inventoryRepository.getTotalStockInBin(4L)).thenReturn(new BigDecimal("3500.0000"));
        when(binRepository.save(any(LocationBin.class))).thenAnswer(call -> call.getArgument(0));

        mockMvc.perform(put("/api/v1/warehouses/bins/4")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"binCode\":\"BIN-U1-01\",\"capacityKg\":8000.0000}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.capacityKg").value(8000.0));
    }

    @Test
    void updateBinCapacityRejectsReductionBelowCurrentOccupancy() throws Exception {
        LocationBin bin = mockBinHierarchy();
        when(binRepository.findByIdWithLock(4L)).thenReturn(Optional.of(bin));
        when(inventoryRepository.getTotalStockInBin(4L)).thenReturn(new BigDecimal("4500.0000"));

        // Attempting to set capacity to 3000 when occupancy is 4500
        mockMvc.perform(put("/api/v1/warehouses/bins/4")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"binCode\":\"BIN-U1-01\",\"capacityKg\":3000.0000}"))
                .andExpect(status().isBadRequest());
    }
}

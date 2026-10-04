package com.svp.stockai.controller;

import com.svp.stockai.dto.RawMaterialReceiptResponse;
import com.svp.stockai.dto.RawMaterialResponse;
import com.svp.stockai.service.RawMaterialQueryService;
import com.svp.stockai.service.RawMaterialReceiptService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RawMaterialInventoryController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class RawMaterialInventoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RawMaterialReceiptService rawMaterialReceiptService;

    @MockitoBean
    private RawMaterialQueryService rawMaterialQueryService;

    @Test
    void getCollectionReturnsRawMaterialDtos() throws Exception {
        when(rawMaterialQueryService.findAll()).thenReturn(List.of(response(1L, "PP Granules", "PP-001")));

        mockMvc.perform(get("/api/v1/inventory/raw-materials"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].materialId").value(1))
                .andExpect(jsonPath("$[0].materialCode").value("PP-001"))
                .andExpect(jsonPath("$[0].categoryName").value("Polymer"));
    }

    @Test
    void getByIdReturnsRawMaterialDto() throws Exception {
        when(rawMaterialQueryService.findById(1L)).thenReturn(response(1L, "PP Granules", "PP-001"));

        mockMvc.perform(get("/api/v1/inventory/raw-materials/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.materialId").value(1))
                .andExpect(jsonPath("$.defaultUomCode").value("KG"));
    }

    @Test
    void getByIdReturnsNotFoundForUnknownMaterial() throws Exception {
        when(rawMaterialQueryService.findById(999L)).thenThrow(
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Raw material 999 was not found"));

        mockMvc.perform(get("/api/v1/inventory/raw-materials/999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void postRejectsInvalidReceiptRequest() throws Exception {
        mockMvc.perform(post("/api/v1/inventory/raw-materials")
                        .contentType("application/json")
                        .content("{\"materialId\":1,\"binId\":2,\"batchNo\":\"\",\"quantityKg\":0,\"unitCost\":10}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void postCreatesReceipt() throws Exception {
        when(rawMaterialReceiptService.receive(any())).thenReturn(new RawMaterialReceiptResponse(
                3L, 4L, 5L, "B-001", new BigDecimal("25.0000"),
                OffsetDateTime.parse("2026-09-02T10:00:00Z"), "Available"));

        mockMvc.perform(post("/api/v1/inventory/raw-materials")
                        .contentType("application/json")
                        .content(validReceiptJson()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.batchId").value(3))
                .andExpect(jsonPath("$.inventoryId").value(4))
                .andExpect(jsonPath("$.transactionId").value(5));
    }

    @Test
    void postReturnsConflictForDuplicateBatchOrLot() throws Exception {
        when(rawMaterialReceiptService.receive(any())).thenThrow(
                new ResponseStatusException(HttpStatus.CONFLICT, "Batch number already exists"));

        mockMvc.perform(post("/api/v1/inventory/raw-materials")
                        .contentType("application/json")
                        .content(validReceiptJson()))
                .andExpect(status().isConflict());
    }

    private RawMaterialResponse response(Long id, String name, String code) {
        return new RawMaterialResponse(id, name, code, 10L, "Polymer", 20L, "KG",
                new BigDecimal("100.0000"), new BigDecimal("50.0000"), new BigDecimal("25.0000"), 7, true);
    }

    private String validReceiptJson() {
        return "{\"materialId\":1,\"binId\":2,\"batchNo\":\"B-001\",\"lotNumber\":\"LOT-001\","
                + "\"quantityKg\":25.0000,\"unitCost\":100.0000,\"qualityStatus\":\"Available\"}";
    }
}

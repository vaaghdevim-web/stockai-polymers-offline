package com.svp.stockai.controller;

import com.svp.stockai.dto.CreatePalletRequest;
import com.svp.stockai.dto.PalletResponse;
import com.svp.stockai.service.PalletService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PalletController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class PalletControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PalletService palletService;

    @Test
    void createPallet_returns201WithPalletResponse() throws Exception {
        PalletResponse response = PalletResponse.builder()
                .palletId(1L)
                .palletCode("PAL-20260905-ABCD1234")
                .barcode("BC-9988776655443322")
                .status("Open")
                .warehouseId(10L)
                .binId(20L)
                .finishedBatchId(30L)
                .quantity(new BigDecimal("500.0000"))
                .build();

        when(palletService.createPallet(any(CreatePalletRequest.class))).thenReturn(response);

        String json = """
                {
                    "finishedBatchId": 30,
                    "warehouseId": 10,
                    "binId": 20,
                    "quantity": 500.0000
                }
                """;

        mockMvc.perform(post("/api/v1/pallets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.palletId").value(1))
                .andExpect(jsonPath("$.palletCode").value("PAL-20260905-ABCD1234"))
                .andExpect(jsonPath("$.barcode").value("BC-9988776655443322"))
                .andExpect(jsonPath("$.status").value("Open"))
                .andExpect(jsonPath("$.warehouseId").value(10))
                .andExpect(jsonPath("$.binId").value(20))
                .andExpect(jsonPath("$.finishedBatchId").value(30))
                .andExpect(jsonPath("$.quantity").value(500.0));
    }

    @Test
    void createPallet_rejectsMissingRequiredFields() throws Exception {
        String invalidJson = """
                {
                    "binId": 20
                }
                """;

        mockMvc.perform(post("/api/v1/pallets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createPallet_rejectsNonPositiveQuantity() throws Exception {
        String zeroQuantityJson = """
                {
                    "finishedBatchId": 30,
                    "warehouseId": 10,
                    "quantity": 0
                }
                """;

        mockMvc.perform(post("/api/v1/pallets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(zeroQuantityJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createPallet_returns404WhenServiceThrowsNotFound() throws Exception {
        when(palletService.createPallet(any(CreatePalletRequest.class)))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Finished batch 999 was not found"));

        String json = """
                {
                    "finishedBatchId": 999,
                    "warehouseId": 10,
                    "quantity": 100
                }
                """;

        mockMvc.perform(post("/api/v1/pallets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isNotFound());
    }

    @Test
    void createPallet_returns400WhenServiceThrowsBadRequestForInactiveBatch() throws Exception {
        when(palletService.createPallet(any(CreatePalletRequest.class)))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Finished batch is inactive"));

        String json = """
                {
                    "finishedBatchId": 30,
                    "warehouseId": 10,
                    "quantity": 100
                }
                """;

        mockMvc.perform(post("/api/v1/pallets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest());
    }
}


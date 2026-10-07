package com.svp.stockai.controller;

import com.svp.stockai.dto.StockTransferItemResponse;
import com.svp.stockai.dto.StockTransferResponse;
import com.svp.stockai.service.StockTransferService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(StockTransferController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class StockTransferControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private StockTransferService stockTransferService;

    @Test
    @DisplayName("POST /api/v1/transfers returns 201 Created")
    void createTransfer_Returns201() throws Exception {
        StockTransferResponse response = StockTransferResponse.builder()
                .transferId(10L)
                .transferNumber("TRF-20260908-ABC123")
                .fromWarehouseId(1L)
                .fromWarehouseName("Unit 1 Warehouse")
                .toWarehouseId(2L)
                .toWarehouseName("Unit 2 Warehouse")
                .transferDate(LocalDate.now())
                .status("Draft")
                .items(List.of(
                        StockTransferItemResponse.builder()
                                .stiId(1L)
                                .materialBatchId(50L)
                                .fromBinId(101L)
                                .toBinId(201L)
                                .quantity(new BigDecimal("250.0000"))
                                .build()
                ))
                .build();

        when(stockTransferService.createTransfer(any(), any())).thenReturn(response);

        String payload = """
                {
                    "fromWarehouseId": 1,
                    "toWarehouseId": 2,
                    "items": [
                        {
                            "materialBatchId": 50,
                            "fromBinId": 101,
                            "toBinId": 201,
                            "quantity": 250.0000
                        }
                    ]
                }
                """;

        mockMvc.perform(post("/api/v1/transfers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.transferId").value(10))
                .andExpect(jsonPath("$.transferNumber").value("TRF-20260908-ABC123"))
                .andExpect(jsonPath("$.status").value("Draft"));
    }

    @Test
    @DisplayName("PATCH /api/v1/transfers/{id}/complete returns 200 OK")
    void completeTransfer_Returns200() throws Exception {
        StockTransferResponse response = StockTransferResponse.builder()
                .transferId(10L)
                .transferNumber("TRF-20260908-ABC123")
                .status("Completed")
                .build();

        when(stockTransferService.completeTransfer(eq(10L), any())).thenReturn(response);

        mockMvc.perform(patch("/api/v1/transfers/10/complete"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transferId").value(10))
                .andExpect(jsonPath("$.status").value("Completed"));
    }

    @Test
    @DisplayName("PATCH /api/v1/transfers/{id}/cancel returns 200 OK")
    void cancelTransfer_Returns200() throws Exception {
        StockTransferResponse response = StockTransferResponse.builder()
                .transferId(10L)
                .transferNumber("TRF-20260908-ABC123")
                .status("Cancelled")
                .build();

        when(stockTransferService.cancelTransfer(eq(10L), any())).thenReturn(response);

        mockMvc.perform(patch("/api/v1/transfers/10/cancel"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transferId").value(10))
                .andExpect(jsonPath("$.status").value("Cancelled"));
    }
}

package com.svp.stockai.controller;

import com.svp.stockai.dto.PurchaseOrderResponse;
import com.svp.stockai.service.PurchaseOrderService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PurchaseOrderController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class PurchaseOrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PurchaseOrderService purchaseOrderService;

    @Test
    @DisplayName("GET /api/v1/procurement/purchase-orders returns list")
    void listPurchaseOrders_ReturnsList() throws Exception {
        PurchaseOrderResponse po = PurchaseOrderResponse.builder()
                .poId(1L)
                .poNumber("PO-2026-0001")
                .supplierName("Reliable Polymers Ltd")
                .status("Pending")
                .totalAmount(new BigDecimal("50000.00"))
                .poDate(LocalDate.now())
                .items(List.of())
                .build();

        when(purchaseOrderService.getAllPurchaseOrders(null)).thenReturn(List.of(po));

        mockMvc.perform(get("/api/v1/procurement/purchase-orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].poId").value(1))
                .andExpect(jsonPath("$[0].poNumber").value("PO-2026-0001"));
    }

    @Test
    @DisplayName("PATCH /api/v1/procurement/purchase-orders/{id}/cancel cancels PO")
    void cancelPurchaseOrder_ReturnsCancelled() throws Exception {
        PurchaseOrderResponse po = PurchaseOrderResponse.builder()
                .poId(1L)
                .poNumber("PO-2026-0001")
                .supplierName("Reliable Polymers Ltd")
                .status("Cancelled")
                .totalAmount(new BigDecimal("50000.00"))
                .poDate(LocalDate.now())
                .items(List.of())
                .build();

        when(purchaseOrderService.cancelPurchaseOrder(eq(1L), any())).thenReturn(po);

        mockMvc.perform(patch("/api/v1/procurement/purchase-orders/1/cancel"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.poId").value(1))
                .andExpect(jsonPath("$.status").value("Cancelled"));
    }
}

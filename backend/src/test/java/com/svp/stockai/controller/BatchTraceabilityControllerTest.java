package com.svp.stockai.controller;

import com.svp.stockai.dto.traceability.BatchTraceabilityResponse;
import com.svp.stockai.dto.traceability.TraceabilityNode;
import com.svp.stockai.service.BatchTraceabilityService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BatchTraceabilityController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class BatchTraceabilityControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private BatchTraceabilityService batchTraceabilityService;

    @Test
    @DisplayName("GET /api/v1/traceability/backward/{finishedBatchCode} returns 200 with backward lineage")
    void testGetBackwardTraceability() throws Exception {
        TraceabilityNode root = new TraceabilityNode(
                "FINISHED_GOODS",
                "FB-001",
                "50kg PP Bag",
                "Released",
                BigDecimal.valueOf(10000),
                "BAGS",
                "2026-09-22",
                Map.of(),
                List.of()
        );

        BatchTraceabilityResponse response = new BatchTraceabilityResponse(
                "FB-001",
                "BACKWARD",
                true,
                "FINISHED_PRODUCT",
                "50kg PP Bag",
                root,
                List.of(),
                "Backward trace successful"
        );

        when(batchTraceabilityService.getBackwardTraceability("FB-001")).thenReturn(response);

        mockMvc.perform(get("/api/v1/traceability/backward/FB-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.found").value(true))
                .andExpect(jsonPath("$.traceabilityDirection").value("BACKWARD"))
                .andExpect(jsonPath("$.rootNode.identifier").value("FB-001"));
    }

    @Test
    @DisplayName("GET /api/v1/traceability/forward/{rawLotOrBatchNo} returns 200 with forward lineage")
    void testGetForwardTraceability() throws Exception {
        TraceabilityNode root = new TraceabilityNode(
                "RAW_MATERIAL_LOT",
                "LOT-RIL-001",
                "PP Homopolymer",
                "Available",
                BigDecimal.valueOf(25000),
                "KG",
                "2026-09-20",
                Map.of(),
                List.of()
        );

        BatchTraceabilityResponse response = new BatchTraceabilityResponse(
                "LOT-RIL-001",
                "FORWARD",
                true,
                "RAW_MATERIAL",
                "PP Homopolymer",
                root,
                List.of(),
                "Forward trace successful"
        );

        when(batchTraceabilityService.getForwardTraceability("LOT-RIL-001")).thenReturn(response);

        mockMvc.perform(get("/api/v1/traceability/forward/LOT-RIL-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.found").value(true))
                .andExpect(jsonPath("$.traceabilityDirection").value("FORWARD"))
                .andExpect(jsonPath("$.rootNode.identifier").value("LOT-RIL-001"));
    }

    @Test
    @DisplayName("GET /api/v1/traceability/batch/{batchIdentifier} returns 200 with universal resolution")
    void testGetGenealogy() throws Exception {
        BatchTraceabilityResponse response = new BatchTraceabilityResponse(
                "FB-001",
                "BACKWARD",
                true,
                "FINISHED_PRODUCT",
                "50kg PP Bag",
                null,
                List.of(),
                "Lineage resolved"
        );

        when(batchTraceabilityService.getGenealogy("FB-001")).thenReturn(response);

        mockMvc.perform(get("/api/v1/traceability/batch/FB-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.found").value(true));
    }
}

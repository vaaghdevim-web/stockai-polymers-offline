package com.svp.stockai.controller;

import com.svp.stockai.dto.TelemetryBurstRequest;
import com.svp.stockai.dto.TelemetryIngestResponse;
import com.svp.stockai.dto.TelemetryPacketRequest;
import com.svp.stockai.dto.TelemetryStreamEvent;
import com.svp.stockai.service.IoTTelemetryIngestionService;
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
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(IoTTelemetryController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@DisplayName("IoTTelemetryController MockMvc Tests")
class IoTTelemetryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IoTTelemetryIngestionService ingestionService;

    @Test
    @DisplayName("POST /api/v1/iot/telemetry/packet should return 202 ACCEPTED")
    void testIngestPacket_Returns202() throws Exception {
        TelemetryIngestResponse response = TelemetryIngestResponse.builder()
                .status("ACCEPTED")
                .processedCount(1)
                .acceptedCount(1)
                .anomalyCount(0)
                .ingestLatencyMs(2)
                .anomalies(Collections.emptyList())
                .ingestedAt(Instant.now())
                .build();

        when(ingestionService.ingestPacket(any(TelemetryPacketRequest.class))).thenReturn(response);

        String jsonPayload = """
                {
                    "machineCode": "EXT-01",
                    "unit": "Unit 1",
                    "machineType": "Extruder",
                    "machineStatus": "RUNNING",
                    "dieTemp": 235.0,
                    "lineSpeedMpm": 420.0,
                    "packetTimestamp": "2026-09-07T10:00:00Z"
                }
                """;

        mockMvc.perform(post("/api/v1/iot/telemetry/packet")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.processedCount").value(1))
                .andExpect(jsonPath("$.acceptedCount").value(1));
    }

    @Test
    @DisplayName("POST /api/v1/iot/telemetry/packet should return 400 Bad Request when validation fails")
    void testIngestPacket_ValidationFailure() throws Exception {
        // Missing machineCode, machineStatus, and packetTimestamp
        String invalidJson = "{}";

        mockMvc.perform(post("/api/v1/iot/telemetry/packet")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/v1/iot/telemetry/burst should return 202 ACCEPTED")
    void testIngestBurst_Returns202() throws Exception {
        TelemetryIngestResponse response = TelemetryIngestResponse.builder()
                .status("ACCEPTED")
                .processedCount(2)
                .acceptedCount(2)
                .anomalyCount(0)
                .ingestLatencyMs(4)
                .anomalies(Collections.emptyList())
                .ingestedAt(Instant.now())
                .build();

        when(ingestionService.ingestBurst(any(TelemetryBurstRequest.class))).thenReturn(response);

        String jsonPayload = """
                {
                    "gatewayId": "GW-01",
                    "batchTimestamp": "2026-09-07T10:00:00Z",
                    "packets": [
                        {
                            "machineCode": "LOOM-01",
                            "machineStatus": "RUNNING",
                            "packetTimestamp": "2026-09-07T10:00:00Z"
                        },
                        {
                            "machineCode": "LOOM-02",
                            "machineStatus": "RUNNING",
                            "packetTimestamp": "2026-09-07T10:00:00Z"
                        }
                    ]
                }
                """;

        mockMvc.perform(post("/api/v1/iot/telemetry/burst")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.processedCount").value(2));
    }

    @Test
    @DisplayName("GET /api/v1/iot/telemetry/latest/{machineCode} should return 200 with latest sensor reading")
    void testGetLatestReading_Returns200() throws Exception {
        TelemetryPacketRequest packet = TelemetryPacketRequest.builder()
                .machineCode("EXT-01")
                .unit("Unit 1")
                .machineStatus("RUNNING")
                .dieTemp(new BigDecimal("238.0"))
                .packetTimestamp(Instant.now())
                .build();

        when(ingestionService.getLatestReading("EXT-01")).thenReturn(Optional.of(packet));

        mockMvc.perform(get("/api/v1/iot/telemetry/latest/EXT-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.machineCode").value("EXT-01"))
                .andExpect(jsonPath("$.unit").value("Unit 1"))
                .andExpect(jsonPath("$.machineStatus").value("RUNNING"));
    }

    @Test
    @DisplayName("GET /api/v1/iot/telemetry/latest/{machineCode} should return 404 when no data exists")
    void testGetLatestReading_NotFound() throws Exception {
        when(ingestionService.getLatestReading("UNKNOWN-01")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/iot/telemetry/latest/UNKNOWN-01"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /api/v1/iot/telemetry/recent should return 200 with list of events")
    void testGetRecentEvents_Returns200() throws Exception {
        TelemetryStreamEvent event = TelemetryStreamEvent.builder()
                .eventId("EVT-1001")
                .eventType("TELEMETRY_INGESTED")
                .publishedAt(Instant.now())
                .build();

        when(ingestionService.getRecentEvents(eq(10))).thenReturn(List.of(event));

        mockMvc.perform(get("/api/v1/iot/telemetry/recent").param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].eventId").value("EVT-1001"));
    }

    @Test
    @DisplayName("POST /api/v1/iot/telemetry/packet should return 403 Forbidden when machine device ID spoofs different machineCode")
    void testMachineSpoofing_RejectedWith403() throws Exception {
        org.springframework.security.authentication.UsernamePasswordAuthenticationToken deviceAuth =
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        "DEVICE:EXT-01", null, java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_MACHINE"))
                );
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(deviceAuth);

        try {
            String spoofedJson = """
                    {
                        "machineCode": "LOOM-01",
                        "unit": "Unit 2",
                        "machineStatus": "RUNNING",
                        "packetTimestamp": "2026-09-07T10:00:00Z"
                    }
                    """;

            mockMvc.perform(post("/api/v1/iot/telemetry/packet")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(spoofedJson))
                    .andExpect(status().isForbidden());
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }

    @Test
    @DisplayName("POST /api/v1/iot/telemetry/packet should allow gateway aggregating multiple machines")
    void testGatewayAggregation_Allowed() throws Exception {
        org.springframework.security.authentication.UsernamePasswordAuthenticationToken gatewayAuth =
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        "DEVICE:GW-UNIT2-01", null, java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_MACHINE"))
                );
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(gatewayAuth);

        TelemetryIngestResponse response = TelemetryIngestResponse.builder()
                .status("ACCEPTED")
                .processedCount(1)
                .acceptedCount(1)
                .build();
        when(ingestionService.ingestPacket(any(TelemetryPacketRequest.class))).thenReturn(response);

        try {
            String jsonPayload = """
                    {
                        "machineCode": "LOOM-01",
                        "unit": "Unit 2",
                        "machineStatus": "RUNNING",
                        "packetTimestamp": "2026-09-07T10:00:00Z"
                    }
                    """;

            mockMvc.perform(post("/api/v1/iot/telemetry/packet")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(jsonPayload))
                    .andExpect(status().isAccepted());
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }
}

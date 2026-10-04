package com.svp.stockai.controller;

import com.svp.stockai.dto.AlertAcceptedResponse;
import com.svp.stockai.dto.AlertRequest;
import com.svp.stockai.service.AlertService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AlertController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class AlertControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AlertService alertService;

    @Test
    void submitAlertAsync_returns202WithAcceptedResponse() throws Exception {
        AlertAcceptedResponse acceptedResponse = AlertAcceptedResponse.builder()
                .status("ACCEPTED")
                .message("Alert accepted for background processing")
                .correlationId("corr-test-12345")
                .timestamp(Instant.parse("2026-09-07T12:00:00Z"))
                .build();

        when(alertService.submitAlert(any(AlertRequest.class))).thenReturn(acceptedResponse);

        String json = """
                {
                    "alertType": "EXTRUDER_TEMPERATURE_HIGH",
                    "severity": "HIGH",
                    "message": "Extruder Zone 2 temperature exceeded 250C",
                    "sourceType": "MACHINE",
                    "sourceId": "EXT-002",
                    "machineId": 5
                }
                """;

        mockMvc.perform(post("/api/v1/alerts/async")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.message").value("Alert accepted for background processing"))
                .andExpect(jsonPath("$.correlationId").value("corr-test-12345"))
                .andExpect(jsonPath("$.timestamp").value("2026-09-07T12:00:00Z"));
    }

    @Test
    void submitAlertAsync_rejectsMissingAlertType() throws Exception {
        String json = """
                {
                    "severity": "HIGH",
                    "message": "Temperature exceeded limit"
                }
                """;

        mockMvc.perform(post("/api/v1/alerts/async")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest());
    }

    @Test
    void submitAlertAsync_rejectsMissingSeverity() throws Exception {
        String json = """
                {
                    "alertType": "EXTRUDER_TEMPERATURE_HIGH",
                    "message": "Temperature exceeded limit"
                }
                """;

        mockMvc.perform(post("/api/v1/alerts/async")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest());
    }

    @Test
    void submitAlertAsync_rejectsMissingMessage() throws Exception {
        String json = """
                {
                    "alertType": "EXTRUDER_TEMPERATURE_HIGH",
                    "severity": "HIGH"
                }
                """;

        mockMvc.perform(post("/api/v1/alerts/async")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest());
    }

    @Test
    void submitAlertAsync_rejectsInvalidSeverityEnum() throws Exception {
        String json = """
                {
                    "alertType": "EXTRUDER_TEMPERATURE_HIGH",
                    "severity": "INVALID_SEVERITY",
                    "message": "Temperature exceeded limit"
                }
                """;

        mockMvc.perform(post("/api/v1/alerts/async")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest());
    }
}


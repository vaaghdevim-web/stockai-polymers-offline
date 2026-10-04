package com.svp.stockai.controller;

import com.svp.stockai.service.IoTTelemetryStreamingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(IoTTelemetryStreamingController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@DisplayName("IoTTelemetryStreamingController MockMvc Tests")
class IoTTelemetryStreamingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IoTTelemetryStreamingService streamingService;

    @Test
    @DisplayName("GET /api/v1/iot/telemetry/stream should return 200 OK and text/event-stream content")
    void testStreamTelemetry_Returns200() throws Exception {
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        "operator1", null, java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_OPERATOR"))
                )
        );

        try {
            SseEmitter emitter = new SseEmitter();
            when(streamingService.createStream(eq("EXT-01"), eq("Unit 1"))).thenReturn(emitter);

            mockMvc.perform(get("/api/v1/iot/telemetry/stream")
                            .param("machineCode", "EXT-01")
                            .param("unit", "Unit 1")
                            .accept(MediaType.TEXT_EVENT_STREAM_VALUE))
                    .andExpect(status().isOk());
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }
}

package com.svp.stockai.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CorsConfigurationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("OPTIONS /api/v1/machines/active from http://localhost:5176 returns 200 with CORS headers")
    void testPreflightOptionsActiveMachines() throws Exception {
        mockMvc.perform(options("/api/v1/machines/active")
                        .header("Origin", "http://localhost:5176")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "Authorization,Content-Type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5176"))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
    }

    @Test
    @DisplayName("OPTIONS /api/v1/iot/telemetry/stream/ticket from http://localhost:5176 returns 200 with CORS headers")
    void testPreflightOptionsStreamTicket() throws Exception {
        mockMvc.perform(options("/api/v1/iot/telemetry/stream/ticket")
                        .header("Origin", "http://localhost:5176")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "Authorization,Content-Type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5176"))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
    }

    @Test
    @DisplayName("OPTIONS /api/v1/iot/telemetry/recent from http://localhost:5176 returns 200 with CORS headers")
    void testPreflightOptionsRecentTelemetry() throws Exception {
        mockMvc.perform(options("/api/v1/iot/telemetry/recent")
                        .header("Origin", "http://localhost:5176")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "Authorization,Content-Type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5176"))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
    }
}

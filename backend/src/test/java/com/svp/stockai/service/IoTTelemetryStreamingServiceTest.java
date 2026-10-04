package com.svp.stockai.service;

import com.svp.stockai.dto.TelemetryPacketRequest;
import com.svp.stockai.dto.TelemetryStreamEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Instant;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("IoTTelemetryStreamingService Unit Tests")
class IoTTelemetryStreamingServiceTest {

    private IoTTelemetryStreamingService streamingService;

    @BeforeEach
    void setUp() {
        streamingService = new IoTTelemetryStreamingService();
    }

    @Test
    @DisplayName("Should create SSE stream and track active client")
    void testCreateStream() {
        SseEmitter emitter = streamingService.createStream(null, null);
        assertNotNull(emitter);
        assertEquals(1, streamingService.getActiveClientCount());
    }

    @Test
    @DisplayName("Should broadcast event without errors to connected clients")
    void testBroadcastEvent() {
        SseEmitter emitter1 = streamingService.createStream("EXT-01", "Unit 1");
        SseEmitter emitter2 = streamingService.createStream("LOOM-02", "Unit 2");
        assertEquals(2, streamingService.getActiveClientCount());

        TelemetryPacketRequest packet = TelemetryPacketRequest.builder()
                .machineCode("EXT-01")
                .unit("Unit 1")
                .machineStatus("RUNNING")
                .packetTimestamp(Instant.now())
                .build();

        TelemetryStreamEvent event = TelemetryStreamEvent.builder()
                .eventId("EVT-TEST-01")
                .eventType("TELEMETRY_INGESTED")
                .telemetry(packet)
                .anomalies(Collections.emptyList())
                .publishedAt(Instant.now())
                .build();

        assertDoesNotThrow(() -> streamingService.broadcast(event));
    }

    @Test
    @DisplayName("Should remove client cleanly")
    void testRemoveClient() {
        SseEmitter emitter = streamingService.createStream(null, null);
        assertEquals(1, streamingService.getActiveClientCount());

        // Call removeClient
        streamingService.removeClient("non-existent");
        assertEquals(1, streamingService.getActiveClientCount());
    }
}

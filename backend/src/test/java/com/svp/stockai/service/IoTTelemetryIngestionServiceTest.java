package com.svp.stockai.service;

import com.svp.stockai.dto.TelemetryBurstRequest;
import com.svp.stockai.dto.TelemetryIngestResponse;
import com.svp.stockai.dto.TelemetryPacketRequest;
import com.svp.stockai.dto.TelemetryStreamEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("IoTTelemetryIngestionService Unit Tests")
class IoTTelemetryIngestionServiceTest {

    private TelemetryAnomalyEvaluator anomalyEvaluator;

    @Mock
    private IoTTelemetryStreamingService streamingService;

    private IoTTelemetryIngestionService ingestionService;

    @BeforeEach
    void setUp() {
        anomalyEvaluator = new TelemetryAnomalyEvaluator();
        ingestionService = new IoTTelemetryIngestionService(anomalyEvaluator, streamingService);
    }

    @Test
    @DisplayName("Should successfully ingest single telemetry packet and update state")
    void testIngestPacket_Success() {
        TelemetryPacketRequest packet = TelemetryPacketRequest.builder()
                .machineCode("EXT-01")
                .unit("Unit 1")
                .machineType("Extruder")
                .machineStatus("RUNNING")
                .dieTemp(new BigDecimal("235.0"))
                .meltPressureBar(new BigDecimal("140.0"))
                .lineSpeedMpm(new BigDecimal("420.0"))
                .activePowerKw(new BigDecimal("80.0"))
                .packetTimestamp(Instant.now())
                .build();

        TelemetryIngestResponse response = ingestionService.ingestPacket(packet);

        assertNotNull(response);
        assertEquals("ACCEPTED", response.getStatus());
        assertEquals(1, response.getProcessedCount());
        assertEquals(1, response.getAcceptedCount());
        assertEquals(0, response.getAnomalyCount());

        verify(streamingService, times(1)).broadcast(any(TelemetryStreamEvent.class));

        // Verify latest reading cache
        Optional<TelemetryPacketRequest> latest = ingestionService.getLatestReading("EXT-01");
        assertTrue(latest.isPresent());
        assertEquals("EXT-01", latest.get().getMachineCode());
    }

    @Test
    @DisplayName("Should flag anomalies and return ANOMALIES_DETECTED status")
    void testIngestPacket_WithAnomaly() {
        TelemetryPacketRequest packet = TelemetryPacketRequest.builder()
                .machineCode("EXT-01")
                .machineStatus("RUNNING")
                .dieTemp(new BigDecimal("280.0")) // Exceeds 265
                .packetTimestamp(Instant.now())
                .build();

        TelemetryIngestResponse response = ingestionService.ingestPacket(packet);

        assertNotNull(response);
        assertEquals("ANOMALIES_DETECTED", response.getStatus());
        assertEquals(1, response.getAnomalyCount());
        assertEquals(1, response.getAnomalies().size());
        assertEquals("TemperatureHigh", response.getAnomalies().get(0).getAnomalyType());
    }

    @Test
    @DisplayName("Should ingest batch burst packets from edge gateway")
    void testIngestBurst_Success() {
        List<TelemetryPacketRequest> packets = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            packets.add(TelemetryPacketRequest.builder()
                    .machineCode("LOOM-0" + i)
                    .unit("Unit 2")
                    .machineStatus("RUNNING")
                    .loomPpm(180)
                    .packetTimestamp(Instant.now())
                    .build());
        }

        TelemetryBurstRequest burst = TelemetryBurstRequest.builder()
                .gatewayId("GW-UNIT2-01")
                .batchTimestamp(Instant.now())
                .packets(packets)
                .build();

        TelemetryIngestResponse response = ingestionService.ingestBurst(burst);

        assertNotNull(response);
        assertEquals("ACCEPTED", response.getStatus());
        assertEquals(5, response.getProcessedCount());
        assertEquals(5, response.getAcceptedCount());
        verify(streamingService, times(5)).broadcast(any(TelemetryStreamEvent.class));
    }

    @Test
    @DisplayName("Should notify registered downstream event listeners")
    void testNotifyListeners() {
        AtomicInteger listenerCallCount = new AtomicInteger(0);

        TelemetryEventListener testListener = new TelemetryEventListener() {
            @Override
            public void onTelemetryEvent(TelemetryStreamEvent event) {
                listenerCallCount.incrementAndGet();
            }
        };

        // Re-instantiate service with listener
        ingestionService = new IoTTelemetryIngestionService(anomalyEvaluator, streamingService);
        // Set listeners list via reflection or field
        try {
            var field = IoTTelemetryIngestionService.class.getDeclaredField("eventListeners");
            field.setAccessible(true);
            field.set(ingestionService, List.of(testListener));
        } catch (Exception e) {
            fail("Failed to inject test listener: " + e.getMessage());
        }

        TelemetryPacketRequest packet = TelemetryPacketRequest.builder()
                .machineCode("LAM-01")
                .machineStatus("RUNNING")
                .packetTimestamp(Instant.now())
                .build();

        ingestionService.ingestPacket(packet);

        assertEquals(1, listenerCallCount.get(), "Listener should have been triggered on telemetry ingest");
    }

    @Test
    @DisplayName("Should populate and limit recent events ring buffer")
    void testRingBufferLimit() {
        for (int i = 1; i <= 10; i++) {
            TelemetryPacketRequest packet = TelemetryPacketRequest.builder()
                    .machineCode("BCS-01")
                    .machineStatus("RUNNING")
                    .packetTimestamp(Instant.now())
                    .build();
            ingestionService.ingestPacket(packet);
        }

        List<TelemetryStreamEvent> recent5 = ingestionService.getRecentEvents(5);
        assertEquals(5, recent5.size());

        List<TelemetryStreamEvent> recent20 = ingestionService.getRecentEvents(20);
        assertEquals(10, recent20.size());
    }
}

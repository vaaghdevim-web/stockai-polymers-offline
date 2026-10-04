package com.svp.stockai.service;

import com.svp.stockai.dto.TelemetryBurstRequest;
import com.svp.stockai.dto.TelemetryIngestResponse;
import com.svp.stockai.dto.TelemetryPacketRequest;
import com.svp.stockai.entity.MachineTelemetryLog;
import com.svp.stockai.repository.MachineTelemetryLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("IoT Telemetry Reliability & Hardening Tests")
class IoTTelemetryReliabilityTest {

    @Mock
    private IoTTelemetryStreamingService streamingService;

    @Mock
    private MachineTelemetryLogRepository telemetryLogRepository;

    private TelemetryAnomalyEvaluator anomalyEvaluator;
    private IoTTelemetryIngestionService ingestionService;

    @BeforeEach
    void setUp() {
        anomalyEvaluator = new TelemetryAnomalyEvaluator();
        ingestionService = new IoTTelemetryIngestionService(anomalyEvaluator, streamingService, telemetryLogRepository);
    }

    @Test
    @DisplayName("Replay Protection: Replayed and out-of-order sequence packets should be ignored")
    void testReplayProtectionSequenceNumbers() {
        TelemetryPacketRequest packetSeq10 = TelemetryPacketRequest.builder()
                .machineCode("EXT-01")
                .machineStatus("RUNNING")
                .sequenceNumber(10L)
                .packetTimestamp(Instant.now())
                .build();

        TelemetryIngestResponse res1 = ingestionService.ingestPacket(packetSeq10);
        assertEquals("ACCEPTED", res1.getStatus());
        assertEquals(1, res1.getAcceptedCount());

        // Replayed packet with identical sequence number
        TelemetryIngestResponse resDuplicate = ingestionService.ingestPacket(packetSeq10);
        assertEquals("DUPLICATE_PACKET_IGNORED", resDuplicate.getStatus());
        assertEquals(0, resDuplicate.getAcceptedCount());

        // Stale / out-of-order packet with smaller sequence number
        TelemetryPacketRequest packetSeq9 = TelemetryPacketRequest.builder()
                .machineCode("EXT-01")
                .machineStatus("RUNNING")
                .sequenceNumber(9L)
                .packetTimestamp(Instant.now())
                .build();
        TelemetryIngestResponse resStale = ingestionService.ingestPacket(packetSeq9);
        assertEquals("DUPLICATE_PACKET_IGNORED", resStale.getStatus());
        assertEquals(0, resStale.getAcceptedCount());

        // Valid monotonic next sequence packet
        TelemetryPacketRequest packetSeq11 = TelemetryPacketRequest.builder()
                .machineCode("EXT-01")
                .machineStatus("RUNNING")
                .sequenceNumber(11L)
                .packetTimestamp(Instant.now())
                .build();
        TelemetryIngestResponse resValid = ingestionService.ingestPacket(packetSeq11);
        assertEquals("ACCEPTED", resValid.getStatus());
        assertEquals(1, resValid.getAcceptedCount());
    }

    @Test
    @DisplayName("Clock Drift: Packet with timestamp far in past should be rejected")
    void testClockDrift_PastRejected() {
        Instant oldTimestamp = Instant.now().minus(Duration.ofDays(35));
        TelemetryPacketRequest packet = TelemetryPacketRequest.builder()
                .machineCode("EXT-01")
                .machineStatus("RUNNING")
                .packetTimestamp(oldTimestamp)
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                ingestionService.ingestPacket(packet));
        assertTrue(ex.getMessage().contains("too old"));
    }

    @Test
    @DisplayName("Clock Drift: Packet with future timestamp exceeding 5 minutes should be rejected")
    void testClockDrift_FutureRejected() {
        Instant futureTimestamp = Instant.now().plus(Duration.ofMinutes(10));
        TelemetryPacketRequest packet = TelemetryPacketRequest.builder()
                .machineCode("EXT-01")
                .machineStatus("RUNNING")
                .packetTimestamp(futureTimestamp)
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                ingestionService.ingestPacket(packet));
        assertTrue(ex.getMessage().contains("future"));
    }

    @Test
    @DisplayName("Persistence: Ingested packet asynchronously persists to MachineTelemetryLogRepository")
    void testAsyncPersistence() throws Exception {
        TelemetryPacketRequest packet = TelemetryPacketRequest.builder()
                .machineCode("LOOM-05")
                .unit("Unit 2")
                .machineType("Loom")
                .machineStatus("RUNNING")
                .sequenceNumber(501L)
                .dieTemp(new BigDecimal("220.5"))
                .packetTimestamp(Instant.now())
                .build();

        TelemetryIngestResponse response = ingestionService.ingestPacket(packet);
        assertEquals("ACCEPTED", response.getStatus());

        // Allow async virtual thread to execute
        Thread.sleep(200);

        verify(telemetryLogRepository, atLeastOnce()).save(any(MachineTelemetryLog.class));
    }
}

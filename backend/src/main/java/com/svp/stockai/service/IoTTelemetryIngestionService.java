package com.svp.stockai.service;

import com.svp.stockai.dto.*;
import com.svp.stockai.entity.MachineTelemetryLog;
import com.svp.stockai.repository.MachineTelemetryLogRepository;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Slf4j
@Service
public class IoTTelemetryIngestionService {

    private static final int MAX_BUFFER_CAPACITY = 1000;
    private static final Duration MAX_PAST_DRIFT = Duration.ofDays(30);
    private static final Duration MAX_FUTURE_DRIFT = Duration.ofMinutes(5);

    private final TelemetryAnomalyEvaluator anomalyEvaluator;
    private final IoTTelemetryStreamingService streamingService;
    private final MachineTelemetryLogRepository telemetryLogRepository;

    @Autowired(required = false)
    private List<TelemetryEventListener> eventListeners = new ArrayList<>();

    @Autowired(required = false)
    private com.svp.stockai.messaging.StockAiKafkaProducer kafkaProducer;

    // High-speed memory store for latest sensor telemetry per machine
    private final Map<String, TelemetryPacketRequest> latestMachineReadings = new ConcurrentHashMap<>();

    // Sequence tracking for replay protection & duplicate packet detection
    private final Map<String, Long> lastKnownSequenceNumbers = new ConcurrentHashMap<>();

    // In-memory ring buffer of recent events for fast querying / diagnostics
    private final Deque<TelemetryStreamEvent> telemetryRingBuffer = new ConcurrentLinkedDeque<>();

    // Asynchronous worker pool for non-blocking database persistence
    private final ExecutorService persistenceExecutor = Executors.newVirtualThreadPerTaskExecutor();

    @Autowired
    public IoTTelemetryIngestionService(
            TelemetryAnomalyEvaluator anomalyEvaluator,
            IoTTelemetryStreamingService streamingService,
            @Autowired(required = false) MachineTelemetryLogRepository telemetryLogRepository) {
        this.anomalyEvaluator = anomalyEvaluator;
        this.streamingService = streamingService;
        this.telemetryLogRepository = telemetryLogRepository;
    }

    public IoTTelemetryIngestionService(
            TelemetryAnomalyEvaluator anomalyEvaluator,
            IoTTelemetryStreamingService streamingService) {
        this(anomalyEvaluator, streamingService, null);
    }

    @PreDestroy
    public void shutdown() {
        try {
            persistenceExecutor.shutdown();
        } catch (Exception e) {
            log.warn("Error shutting down telemetry persistence executor: {}", e.getMessage());
        }
    }

    public TelemetryIngestResponse ingestPacket(TelemetryPacketRequest packet) {
        long startTime = System.currentTimeMillis();

        if (packet == null || packet.getMachineCode() == null) {
            throw new IllegalArgumentException("Invalid telemetry packet: machineCode is required");
        }

        // 1. Clock drift sanity validation
        validateTimestamp(packet.getPacketTimestamp());

        String machineKey = packet.getMachineCode().toUpperCase();

        // 2. Sequence tracking & Replay / Duplicate packet detection
        if (packet.getSequenceNumber() != null) {
            Long lastSeq = lastKnownSequenceNumbers.get(machineKey);
            if (lastSeq != null && packet.getSequenceNumber() <= lastSeq) {
                log.warn("Replay or duplicate packet detected for machine {}: incoming seq={}, lastSeq={}",
                        machineKey, packet.getSequenceNumber(), lastSeq);
                return TelemetryIngestResponse.builder()
                        .status("DUPLICATE_PACKET_IGNORED")
                        .processedCount(1)
                        .acceptedCount(0)
                        .anomalyCount(0)
                        .ingestLatencyMs(System.currentTimeMillis() - startTime)
                        .anomalies(Collections.emptyList())
                        .ingestedAt(Instant.now())
                        .build();
            }
            lastKnownSequenceNumbers.put(machineKey, packet.getSequenceNumber());
        }

        // 3. Update in-memory latest state
        latestMachineReadings.put(machineKey, packet);

        // 4. Evaluate Anomaly Thresholds
        List<MachineAnomalyDto> anomalies = anomalyEvaluator.evaluate(packet);

        // 5. Build Stream Event
        String eventType = anomalies.isEmpty() ? "TELEMETRY_INGESTED" : "ANOMALY_DETECTED";
        TelemetryStreamEvent event = TelemetryStreamEvent.builder()
                .eventId("EVT-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase())
                .eventType(eventType)
                .telemetry(packet)
                .anomalies(anomalies)
                .publishedAt(Instant.now())
                .build();

        // 6. Store in Ring Buffer
        appendRingBuffer(event);

        // 7. Broadcast to SSE Streaming clients (asynchronously decoupled)
        streamingService.broadcast(event);

        // 8. Notify registered downstream listeners
        notifyListeners(event);

        // 9. Asynchronously persist to database log table
        persistTelemetryAsync(packet, anomalies.size());

        // 10. Publish to Kafka topics if enabled
        if (kafkaProducer != null && kafkaProducer.isKafkaEnabled()) {
            kafkaProducer.publishTelemetry(packet);
            for (MachineAnomalyDto a : anomalies) {
                kafkaProducer.publishAnomaly(a);
            }
        }

        long latencyMs = System.currentTimeMillis() - startTime;
        String status = anomalies.isEmpty() ? "ACCEPTED" : "ANOMALIES_DETECTED";

        return TelemetryIngestResponse.builder()
                .status(status)
                .processedCount(1)
                .acceptedCount(1)
                .anomalyCount(anomalies.size())
                .ingestLatencyMs(latencyMs)
                .anomalies(anomalies)
                .ingestedAt(Instant.now())
                .build();
    }

    public TelemetryIngestResponse ingestBurst(TelemetryBurstRequest burst) {
        long startTime = System.currentTimeMillis();

        if (burst == null || burst.getPackets() == null || burst.getPackets().isEmpty()) {
            throw new IllegalArgumentException("Burst payload must contain at least one telemetry packet");
        }

        int processed = 0;
        int accepted = 0;
        List<MachineAnomalyDto> allAnomalies = new ArrayList<>();

        for (TelemetryPacketRequest packet : burst.getPackets()) {
            if (packet == null || packet.getMachineCode() == null) {
                continue;
            }
            processed++;

            // Clock drift check
            try {
                validateTimestamp(packet.getPacketTimestamp());
            } catch (Exception ex) {
                log.warn("Dropping packet in burst due to invalid timestamp: {}", ex.getMessage());
                continue;
            }

            String machineKey = packet.getMachineCode().toUpperCase();

            // Sequence tracking & deduplication
            if (packet.getSequenceNumber() != null) {
                Long lastSeq = lastKnownSequenceNumbers.get(machineKey);
                if (lastSeq != null && packet.getSequenceNumber() <= lastSeq) {
                    log.warn("Dropping replayed packet in burst for machine {}: seq={}", machineKey, packet.getSequenceNumber());
                    continue;
                }
                lastKnownSequenceNumbers.put(machineKey, packet.getSequenceNumber());
            }

            // 1. Update latest reading
            latestMachineReadings.put(machineKey, packet);

            // 2. Evaluate Anomaly
            List<MachineAnomalyDto> anomalies = anomalyEvaluator.evaluate(packet);
            allAnomalies.addAll(anomalies);

            // 3. Build & Dispatch Stream Event
            String eventType = anomalies.isEmpty() ? "TELEMETRY_INGESTED" : "ANOMALY_DETECTED";
            TelemetryStreamEvent event = TelemetryStreamEvent.builder()
                    .eventId("EVT-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase())
                    .eventType(eventType)
                    .telemetry(packet)
                    .anomalies(anomalies)
                    .publishedAt(Instant.now())
                    .build();

            appendRingBuffer(event);
            streamingService.broadcast(event);
            notifyListeners(event);
            persistTelemetryAsync(packet, anomalies.size());
            accepted++;
        }

        long latencyMs = System.currentTimeMillis() - startTime;
        String status = allAnomalies.isEmpty() ? "ACCEPTED" : "ANOMALIES_DETECTED";

        return TelemetryIngestResponse.builder()
                .status(status)
                .processedCount(processed)
                .acceptedCount(accepted)
                .anomalyCount(allAnomalies.size())
                .ingestLatencyMs(latencyMs)
                .anomalies(allAnomalies)
                .ingestedAt(Instant.now())
                .build();
    }

    public Optional<TelemetryPacketRequest> getLatestReading(String machineCode) {
        if (machineCode == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(latestMachineReadings.get(machineCode.toUpperCase()));
    }

    public List<TelemetryStreamEvent> getRecentEvents(int limit) {
        int targetLimit = Math.min(Math.max(limit, 1), 100);
        List<TelemetryStreamEvent> result = new ArrayList<>();
        Iterator<TelemetryStreamEvent> iterator = telemetryRingBuffer.iterator();
        while (iterator.hasNext() && result.size() < targetLimit) {
            result.add(iterator.next());
        }
        return result;
    }

    private void validateTimestamp(Instant packetTimestamp) {
        if (packetTimestamp == null) {
            throw new IllegalArgumentException("packetTimestamp is required");
        }
        Instant now = Instant.now();
        if (packetTimestamp.isBefore(now.minus(MAX_PAST_DRIFT))) {
            throw new IllegalArgumentException("Packet timestamp is too old (exceeds maximum allowed 30-day drift window)");
        }
        if (packetTimestamp.isAfter(now.plus(MAX_FUTURE_DRIFT))) {
            throw new IllegalArgumentException("Packet timestamp is in the future (clock skew exceeds 5-minute threshold)");
        }
    }

    private void persistTelemetryAsync(TelemetryPacketRequest packet, int anomalyCount) {
        if (telemetryLogRepository == null || packet == null) {
            return;
        }

        persistenceExecutor.submit(() -> {
            try {
                MachineTelemetryLog logEntry = MachineTelemetryLog.builder()
                        .machineCode(packet.getMachineCode().toUpperCase())
                        .unit(packet.getUnit())
                        .machineType(packet.getMachineType())
                        .sequenceNumber(packet.getSequenceNumber())
                        .machineStatus(packet.getMachineStatus())
                        .zone1Temp(packet.getZone1Temp())
                        .zone2Temp(packet.getZone2Temp())
                        .zone3Temp(packet.getZone3Temp())
                        .zone4Temp(packet.getZone4Temp())
                        .zone5Temp(packet.getZone5Temp())
                        .zone6Temp(packet.getZone6Temp())
                        .dieTemp(packet.getDieTemp())
                        .meltPressureBar(packet.getMeltPressureBar())
                        .screwRpm(packet.getScrewRpm())
                        .lineSpeedMpm(packet.getLineSpeedMpm())
                        .loomPpm(packet.getLoomPpm())
                        .activePowerKw(packet.getActivePowerKw())
                        .gsmMeasured(packet.getGsmMeasured())
                        .denierDeviation(packet.getDenierDeviation())
                        .tapeWidthMm(packet.getTapeWidthMm())
                        .anomalyCount(anomalyCount)
                        .packetTimestamp(packet.getPacketTimestamp() != null ? packet.getPacketTimestamp() : Instant.now())
                        .build();

                telemetryLogRepository.save(logEntry);
            } catch (Exception ex) {
                log.warn("Failed to persist telemetry log for machine {}: {}", packet.getMachineCode(), ex.getMessage());
            }
        });
    }

    private void appendRingBuffer(TelemetryStreamEvent event) {
        telemetryRingBuffer.addFirst(event);
        while (telemetryRingBuffer.size() > MAX_BUFFER_CAPACITY) {
            telemetryRingBuffer.removeLast();
        }
    }

    private void notifyListeners(TelemetryStreamEvent event) {
        if (eventListeners == null || eventListeners.isEmpty()) {
            return;
        }

        String machineCode = event.getTelemetry().getMachineCode();
        for (TelemetryEventListener listener : eventListeners) {
            try {
                if (listener.supports(machineCode)) {
                    listener.onTelemetryEvent(event);
                }
            } catch (Exception e) {
                log.error("Error executing telemetry event listener: {}", e.getMessage(), e);
            }
        }
    }
}

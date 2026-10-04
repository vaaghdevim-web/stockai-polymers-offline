package com.svp.stockai.messaging;

import com.svp.stockai.config.KafkaConfig;
import com.svp.stockai.dto.AlertMessage;
import com.svp.stockai.dto.MachineAnomalyDto;
import com.svp.stockai.dto.TelemetryPacketRequest;
import com.svp.stockai.entity.MachineTelemetryLog;
import com.svp.stockai.repository.MachineTelemetryLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Production Kafka event consumer listening to incoming streaming topics.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "stockai.kafka.enabled", havingValue = "true", matchIfMissing = false)
public class StockAiKafkaConsumer {

    private final MachineTelemetryLogRepository telemetryLogRepository;

    @KafkaListener(topics = KafkaConfig.TOPIC_TELEMETRY_EVENTS, groupId = "stockai-telemetry-group")
    public void consumeTelemetryEvent(TelemetryPacketRequest packet) {
        log.debug("Consumed telemetry event from Kafka: machine={}", packet.getMachineCode());
        if (packet != null && packet.getMachineCode() != null) {
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
                        .packetTimestamp(packet.getPacketTimestamp() != null ? packet.getPacketTimestamp() : Instant.now())
                        .build();

                telemetryLogRepository.save(logEntry);
            } catch (Exception ex) {
                log.warn("Failed to persist consumed Kafka telemetry for machine {}: {}", packet.getMachineCode(), ex.getMessage());
            }
        }
    }

    @KafkaListener(topics = KafkaConfig.TOPIC_TELEMETRY_ANOMALIES, groupId = "stockai-anomaly-group")
    public void consumeAnomalyEvent(MachineAnomalyDto anomaly) {
        log.warn("Consumed anomaly alert from Kafka: machine={}, type={}, severity={}",
                anomaly.getMachineCode(), anomaly.getAnomalyType(), anomaly.getSeverity());
    }

    @KafkaListener(topics = KafkaConfig.TOPIC_ALERTS_CRITICAL, groupId = "stockai-alert-group")
    public void consumeAlertEvent(AlertMessage alert) {
        log.info("Consumed critical alert from Kafka: correlationId={}, type={}",
                alert.getCorrelationId(), alert.getAlertType());
    }
}

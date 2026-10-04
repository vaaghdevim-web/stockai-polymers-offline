package com.svp.stockai.messaging;

import com.svp.stockai.config.KafkaConfig;
import com.svp.stockai.dto.AlertMessage;
import com.svp.stockai.dto.MachineAnomalyDto;
import com.svp.stockai.dto.TelemetryPacketRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

/**
 * Production-grade Apache Kafka event producer for StockAI event streaming.
 * Uses partition keys (machineCode, correlationId) to ensure per-resource FIFO ordering.
 */
@Slf4j
@Service
public class StockAiKafkaProducer {

    @Autowired(required = false)
    private KafkaTemplate<String, Object> kafkaTemplate;

    public boolean isKafkaEnabled() {
        return kafkaTemplate != null;
    }

    public CompletableFuture<Boolean> publishTelemetry(TelemetryPacketRequest packet) {
        if (kafkaTemplate == null || packet == null) {
            log.debug("Kafka producer disabled or null packet; bypassing Kafka publish for telemetry: {}", packet);
            return CompletableFuture.completedFuture(false);
        }

        String key = packet.getMachineCode() != null ? packet.getMachineCode().toUpperCase() : "DEFAULT_MCH";
        return kafkaTemplate.send(KafkaConfig.TOPIC_TELEMETRY_EVENTS, key, packet)
                .thenApply(result -> {
                    log.debug("Published telemetry event to Kafka [topic={}, key={}, offset={}]",
                            KafkaConfig.TOPIC_TELEMETRY_EVENTS, key, result.getRecordMetadata().offset());
                    return true;
                })
                .exceptionally(ex -> {
                    log.error("Failed to publish telemetry to Kafka: {}", ex.getMessage(), ex);
                    return false;
                });
    }

    public CompletableFuture<Boolean> publishAnomaly(MachineAnomalyDto anomaly) {
        if (kafkaTemplate == null || anomaly == null) {
            return CompletableFuture.completedFuture(false);
        }

        String key = anomaly.getMachineCode() != null ? anomaly.getMachineCode().toUpperCase() : "ANOMALY";
        return kafkaTemplate.send(KafkaConfig.TOPIC_TELEMETRY_ANOMALIES, key, anomaly)
                .thenApply(result -> {
                    log.info("Published machine anomaly event to Kafka [key={}, type={}]", key, anomaly.getAnomalyType());
                    return true;
                })
                .exceptionally(ex -> {
                    log.error("Failed to publish anomaly to Kafka: {}", ex.getMessage(), ex);
                    return false;
                });
    }

    public CompletableFuture<Boolean> publishAlert(AlertMessage alert) {
        if (kafkaTemplate == null || alert == null) {
            return CompletableFuture.completedFuture(false);
        }

        String key = alert.getCorrelationId() != null ? alert.getCorrelationId() : "ALERT";
        return kafkaTemplate.send(KafkaConfig.TOPIC_ALERTS_CRITICAL, key, alert)
                .thenApply(result -> {
                    log.info("Published critical alert to Kafka [key={}, severity={}]", key, alert.getSeverity());
                    return true;
                })
                .exceptionally(ex -> {
                    log.error("Failed to publish alert to Kafka: {}", ex.getMessage(), ex);
                    return false;
                });
    }

    public CompletableFuture<Boolean> publishInventoryMovement(String batchCode, Object movementPayload) {
        if (kafkaTemplate == null || movementPayload == null) {
            return CompletableFuture.completedFuture(false);
        }

        String key = batchCode != null ? batchCode : "BATCH";
        return kafkaTemplate.send(KafkaConfig.TOPIC_INVENTORY_MOVEMENTS, key, movementPayload)
                .thenApply(result -> {
                    log.debug("Published inventory movement to Kafka [key={}]", key);
                    return true;
                })
                .exceptionally(ex -> {
                    log.error("Failed to publish inventory movement to Kafka: {}", ex.getMessage(), ex);
                    return false;
                });
    }
}

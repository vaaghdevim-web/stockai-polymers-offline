package com.svp.stockai.messaging;

import com.svp.stockai.config.KafkaConfig;
import com.svp.stockai.dto.AlertMessage;
import com.svp.stockai.dto.AlertSeverity;
import com.svp.stockai.dto.MachineAnomalyDto;
import com.svp.stockai.dto.TelemetryPacketRequest;
import org.apache.kafka.clients.producer.RecordMetadata;
import org.apache.kafka.common.TopicPartition;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("StockAiKafkaMessaging Unit Tests")
class StockAiKafkaMessagingTest {

    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    private StockAiKafkaProducer producer;

    @BeforeEach
    void setUp() {
        producer = new StockAiKafkaProducer();
        ReflectionTestUtils.setField(producer, "kafkaTemplate", kafkaTemplate);
    }

    private SendResult<String, Object> createMockSendResult(String topic, int partition, long offset) {
        RecordMetadata metadata = org.mockito.Mockito.mock(RecordMetadata.class);
        org.mockito.Mockito.lenient().when(metadata.offset()).thenReturn(offset);
        return new SendResult<>(null, metadata);
    }

    @Test
    @DisplayName("Publish telemetry packet to Kafka topic")
    void testPublishTelemetry() {
        TelemetryPacketRequest packet = TelemetryPacketRequest.builder()
                .machineCode("MCH-EXT-01")
                .zone1Temp(new BigDecimal("210.0"))
                .packetTimestamp(Instant.now())
                .build();

        SendResult<String, Object> mockResult = createMockSendResult(KafkaConfig.TOPIC_TELEMETRY_EVENTS, 0, 100L);
        when(kafkaTemplate.send(eq(KafkaConfig.TOPIC_TELEMETRY_EVENTS), eq("MCH-EXT-01"), eq(packet)))
                .thenReturn(CompletableFuture.completedFuture(mockResult));

        CompletableFuture<Boolean> future = producer.publishTelemetry(packet);
        assertThat(future.join()).isTrue();
        verify(kafkaTemplate).send(KafkaConfig.TOPIC_TELEMETRY_EVENTS, "MCH-EXT-01", packet);
    }

    @Test
    @DisplayName("Publish machine anomaly to Kafka topic")
    void testPublishAnomaly() {
        MachineAnomalyDto anomaly = MachineAnomalyDto.builder()
                .machineCode("MCH-WEAV-02")
                .anomalyType("TemperatureHigh")
                .severity("HIGH")
                .detectedAt(Instant.now())
                .build();

        SendResult<String, Object> mockResult = createMockSendResult(KafkaConfig.TOPIC_TELEMETRY_ANOMALIES, 1, 101L);
        when(kafkaTemplate.send(eq(KafkaConfig.TOPIC_TELEMETRY_ANOMALIES), eq("MCH-WEAV-02"), eq(anomaly)))
                .thenReturn(CompletableFuture.completedFuture(mockResult));

        CompletableFuture<Boolean> future = producer.publishAnomaly(anomaly);
        assertThat(future.join()).isTrue();
        verify(kafkaTemplate).send(KafkaConfig.TOPIC_TELEMETRY_ANOMALIES, "MCH-WEAV-02", anomaly);
    }

    @Test
    @DisplayName("Publish critical alert to Kafka topic")
    void testPublishAlert() {
        AlertMessage alert = AlertMessage.builder()
                .correlationId("CORR-999")
                .alertType("MACHINE_FAULT")
                .severity(AlertSeverity.CRITICAL)
                .message("Extruder motor overload")
                .build();

        SendResult<String, Object> mockResult = createMockSendResult(KafkaConfig.TOPIC_ALERTS_CRITICAL, 2, 102L);
        when(kafkaTemplate.send(eq(KafkaConfig.TOPIC_ALERTS_CRITICAL), eq("CORR-999"), eq(alert)))
                .thenReturn(CompletableFuture.completedFuture(mockResult));

        CompletableFuture<Boolean> future = producer.publishAlert(alert);
        assertThat(future.join()).isTrue();
        verify(kafkaTemplate).send(KafkaConfig.TOPIC_ALERTS_CRITICAL, "CORR-999", alert);
    }

    @Test
    @DisplayName("Gracefully handle disabled Kafka (null template)")
    void testKafkaDisabled() {
        StockAiKafkaProducer disabledProducer = new StockAiKafkaProducer();
        assertThat(disabledProducer.isKafkaEnabled()).isFalse();

        CompletableFuture<Boolean> res = disabledProducer.publishTelemetry(TelemetryPacketRequest.builder().build());
        assertThat(res.join()).isFalse();
    }
}

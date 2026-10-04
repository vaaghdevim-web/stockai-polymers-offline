package com.svp.stockai.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JsonSerializer;

import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableKafka
@ConditionalOnProperty(name = "stockai.kafka.enabled", havingValue = "true", matchIfMissing = false)
public class KafkaConfig {

    public static final String TOPIC_TELEMETRY_EVENTS = "stockai.telemetry.events";
    public static final String TOPIC_TELEMETRY_ANOMALIES = "stockai.telemetry.anomalies";
    public static final String TOPIC_INVENTORY_MOVEMENTS = "stockai.inventory.movements";
    public static final String TOPIC_PRODUCTION_STAGES = "stockai.production.stages";
    public static final String TOPIC_ALERTS_CRITICAL = "stockai.alerts.critical";
    public static final String TOPIC_DEAD_LETTER = "stockai.dead-letter.events";

    @Value("${spring.kafka.bootstrap-servers:localhost:9092}")
    private String bootstrapServers;

    @Value("${stockai.kafka.replication-factor:1}")
    private int topicReplicationFactor;

    @Bean
    public NewTopic telemetryEventsTopic() {
        return TopicBuilder.name(TOPIC_TELEMETRY_EVENTS)
                .partitions(12)
                .replicas(topicReplicationFactor)
                .build();
    }

    @Bean
    public NewTopic telemetryAnomaliesTopic() {
        return TopicBuilder.name(TOPIC_TELEMETRY_ANOMALIES)
                .partitions(6)
                .replicas(topicReplicationFactor)
                .build();
    }

    @Bean
    public NewTopic inventoryMovementsTopic() {
        return TopicBuilder.name(TOPIC_INVENTORY_MOVEMENTS)
                .partitions(6)
                .replicas(topicReplicationFactor)
                .build();
    }

    @Bean
    public NewTopic productionStagesTopic() {
        return TopicBuilder.name(TOPIC_PRODUCTION_STAGES)
                .partitions(6)
                .replicas(topicReplicationFactor)
                .build();
    }

    @Bean
    public NewTopic alertsCriticalTopic() {
        return TopicBuilder.name(TOPIC_ALERTS_CRITICAL)
                .partitions(6)
                .replicas(topicReplicationFactor)
                .build();
    }

    @Bean
    public NewTopic deadLetterTopic() {
        return TopicBuilder.name(TOPIC_DEAD_LETTER)
                .partitions(3)
                .replicas(topicReplicationFactor)
                .build();
    }

    @Bean
    public ProducerFactory<String, Object> producerFactory() {
        Map<String, Object> configProps = new HashMap<>();
        configProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        configProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        configProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        configProps.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        configProps.put(ProducerConfig.ACKS_CONFIG, "all");
        configProps.put(ProducerConfig.RETRIES_CONFIG, 3);
        return new DefaultKafkaProducerFactory<>(configProps);
    }

    @Bean
    public KafkaTemplate<String, Object> kafkaTemplate() {
        return new KafkaTemplate<>(producerFactory());
    }
}

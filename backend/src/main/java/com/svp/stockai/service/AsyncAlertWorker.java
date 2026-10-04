package com.svp.stockai.service;

import com.svp.stockai.dto.AlertMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

@Slf4j
@Component
public class AsyncAlertWorker {

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private MultiChannelNotificationService notificationService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.svp.stockai.messaging.StockAiKafkaProducer kafkaProducer;

    @Async("alertTaskExecutor")
    public CompletableFuture<Void> processAlert(AlertMessage alert) {
        String threadName = Thread.currentThread().getName();
        if (alert == null) {
            log.warn("Received null alert message for background processing on thread [{}]", threadName);
            return CompletableFuture.completedFuture(null);
        }

        log.info("Alert processing started on thread [{}]: correlationId={}, type={}, severity={}, sourceType={}, sourceId={}, machineId={}",
                threadName,
                alert.getCorrelationId(),
                alert.getAlertType(),
                alert.getSeverity(),
                alert.getSourceType(),
                alert.getSourceId(),
                alert.getMachineId());

        try {
            // Background alert processing business logic
            // Handle alert dispatching, notification hooks, and anomaly tracking
            handleAlertProcessing(alert);

            log.info("Alert processing completed successfully on thread [{}]: correlationId={}",
                    threadName,
                    alert.getCorrelationId());
        } catch (Exception e) {
            log.error("Alert processing failed on thread [{}] for correlationId={}: {}",
                    threadName,
                    alert.getCorrelationId(),
                    e.getMessage(),
                    e);
        }

        return CompletableFuture.completedFuture(null);
    }

    private void handleAlertProcessing(AlertMessage alert) {
        if (alert.getMessage() == null || alert.getMessage().isBlank()) {
            throw new IllegalArgumentException("Alert message payload cannot be empty");
        }
        if (kafkaProducer != null && kafkaProducer.isKafkaEnabled()) {
            kafkaProducer.publishAlert(alert);
        }
        if (notificationService != null) {
            notificationService.dispatchNotification(alert);
        }
    }
}


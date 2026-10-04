package com.svp.stockai.service;

import com.svp.stockai.dto.AlertMessage;
import com.svp.stockai.dto.AlertSeverity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("MultiChannelNotificationService Unit Tests")
class MultiChannelNotificationServiceTest {

    private MultiChannelNotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationService = new MultiChannelNotificationService();
    }

    @Test
    @DisplayName("Dispatch critical alert across all channels")
    void testDispatchCriticalAlert() {
        AlertMessage alert = AlertMessage.builder()
                .correlationId("CORR-CRIT-1")
                .alertType("LINE_STOPPAGE")
                .severity(AlertSeverity.CRITICAL)
                .message("Unit 1 Extruder 1 Emergency Stop triggered")
                .timestamp(Instant.now())
                .build();

        CompletableFuture<Void> future = notificationService.dispatchNotification(alert);
        assertThat(future).isCompleted();
    }

    @Test
    @DisplayName("Gracefully handle null alert message")
    void testDispatchNullAlert() {
        CompletableFuture<Void> future = notificationService.dispatchNotification(null);
        assertThat(future).isCompleted();
    }
}

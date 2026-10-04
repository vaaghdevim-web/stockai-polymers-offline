package com.svp.stockai.service;

import com.svp.stockai.dto.AlertMessage;
import com.svp.stockai.dto.AlertSeverity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;

class AsyncAlertWorkerTest {

    private AsyncAlertWorker asyncAlertWorker;

    @BeforeEach
    void setUp() {
        asyncAlertWorker = new AsyncAlertWorker();
    }

    @Test
    void processAlert_processesValidAlertSuccessfully() {
        AlertMessage alert = AlertMessage.builder()
                .correlationId(UUID.randomUUID().toString())
                .alertType("TEMPERATURE_THRESHOLD_EXCEEDED")
                .severity(AlertSeverity.HIGH)
                .message("Extruder zone 3 temperature exceeded 240C")
                .sourceType("MACHINE")
                .sourceId("EXT-001")
                .machineId(10L)
                .timestamp(Instant.now())
                .build();

        CompletableFuture<Void> future = asyncAlertWorker.processAlert(alert);

        assertNotNull(future);
        assertTrue(future.isDone());
        assertFalse(future.isCompletedExceptionally());
    }

    @Test
    void processAlert_handlesNullAlertGracefully() {
        CompletableFuture<Void> future = asyncAlertWorker.processAlert(null);

        assertNotNull(future);
        assertTrue(future.isDone());
        assertFalse(future.isCompletedExceptionally());
    }

    @Test
    void processAlert_handlesEmptyMessageWithoutCrashing() {
        AlertMessage alert = AlertMessage.builder()
                .correlationId("test-corr-123")
                .alertType("PRESSURE_FAULT")
                .severity(AlertSeverity.CRITICAL)
                .message("")
                .build();

        // Worker catches exception internally and logs error safely
        CompletableFuture<Void> future = asyncAlertWorker.processAlert(alert);

        assertNotNull(future);
        assertTrue(future.isDone());
        assertFalse(future.isCompletedExceptionally());
    }
}


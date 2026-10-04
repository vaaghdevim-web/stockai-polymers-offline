package com.svp.stockai.service;

import com.svp.stockai.dto.AlertAcceptedResponse;
import com.svp.stockai.dto.AlertMessage;
import com.svp.stockai.dto.AlertRequest;
import com.svp.stockai.dto.AlertSeverity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AlertServiceTest {

    @Mock
    private AsyncAlertWorker asyncAlertWorker;

    private AlertService alertService;

    @BeforeEach
    void setUp() {
        alertService = new AlertService(asyncAlertWorker);
    }

    @Test
    void submitAlert_generatesCorrelationIdAndDelegatesToWorker() {
        when(asyncAlertWorker.processAlert(any(AlertMessage.class)))
                .thenReturn(CompletableFuture.completedFuture(null));

        AlertRequest request = AlertRequest.builder()
                .alertType("LOOM_STOP_ANOMALY")
                .severity(AlertSeverity.MEDIUM)
                .message("Circular loom #4 warp thread break detected")
                .sourceType("MACHINE")
                .sourceId("LOM-004")
                .machineId(15L)
                .build();

        AlertAcceptedResponse response = alertService.submitAlert(request);

        assertNotNull(response);
        assertEquals("ACCEPTED", response.getStatus());
        assertEquals("Alert accepted for background processing", response.getMessage());
        assertNotNull(response.getCorrelationId());
        assertFalse(response.getCorrelationId().isBlank());
        assertNotNull(response.getTimestamp());

        ArgumentCaptor<AlertMessage> captor = ArgumentCaptor.forClass(AlertMessage.class);
        verify(asyncAlertWorker).processAlert(captor.capture());

        AlertMessage captured = captor.getValue();
        assertEquals(response.getCorrelationId(), captured.getCorrelationId());
        assertEquals("LOOM_STOP_ANOMALY", captured.getAlertType());
        assertEquals(AlertSeverity.MEDIUM, captured.getSeverity());
        assertEquals("Circular loom #4 warp thread break detected", captured.getMessage());
        assertEquals("MACHINE", captured.getSourceType());
        assertEquals("LOM-004", captured.getSourceId());
        assertEquals(15L, captured.getMachineId());
    }

    @Test
    void submitAlert_preservesExplicitCorrelationIdAndTimestamp() {
        when(asyncAlertWorker.processAlert(any(AlertMessage.class)))
                .thenReturn(CompletableFuture.completedFuture(null));

        Instant fixedTimestamp = Instant.parse("2026-09-07T12:00:00Z");
        AlertRequest request = AlertRequest.builder()
                .correlationId("CUSTOM-CORR-999")
                .alertType("QUALITY_DEFECT")
                .severity(AlertSeverity.CRITICAL)
                .message("Tensile strength test below minimum spec")
                .timestamp(fixedTimestamp)
                .build();

        AlertAcceptedResponse response = alertService.submitAlert(request);

        assertNotNull(response);
        assertEquals("ACCEPTED", response.getStatus());
        assertEquals("CUSTOM-CORR-999", response.getCorrelationId());
        assertEquals(fixedTimestamp, response.getTimestamp());

        ArgumentCaptor<AlertMessage> captor = ArgumentCaptor.forClass(AlertMessage.class);
        verify(asyncAlertWorker).processAlert(captor.capture());

        AlertMessage captured = captor.getValue();
        assertEquals("CUSTOM-CORR-999", captured.getCorrelationId());
        assertEquals(fixedTimestamp, captured.getTimestamp());
        assertEquals(AlertSeverity.CRITICAL, captured.getSeverity());
    }

    @Test
    void submitAlert_throwsExceptionOnNullRequest() {
        assertThrows(IllegalArgumentException.class, () -> alertService.submitAlert(null));
    }
}


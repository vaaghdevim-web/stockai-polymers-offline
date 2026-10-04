package com.svp.stockai.service;

import com.svp.stockai.dto.AlertAcceptedResponse;
import com.svp.stockai.dto.AlertMessage;
import com.svp.stockai.dto.AlertRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertService {

    private final AsyncAlertWorker asyncAlertWorker;

    public AlertAcceptedResponse submitAlert(AlertRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Alert request cannot be null");
        }
        String correlationId = (request.getCorrelationId() != null && !request.getCorrelationId().isBlank())
                ? request.getCorrelationId()
                : UUID.randomUUID().toString();

        Instant timestamp = (request.getTimestamp() != null)
                ? request.getTimestamp()
                : Instant.now();

        AlertMessage message = AlertMessage.builder()
                .correlationId(correlationId)
                .alertType(request.getAlertType())
                .severity(request.getSeverity())
                .message(request.getMessage())
                .sourceType(request.getSourceType())
                .sourceId(request.getSourceId())
                .machineId(request.getMachineId())
                .timestamp(timestamp)
                .build();

        log.info("Alert submitted for background execution: correlationId={}, type={}, severity={}",
                correlationId,
                request.getAlertType(),
                request.getSeverity());

        // Delegate to async worker on dedicated alertTaskExecutor
        asyncAlertWorker.processAlert(message);

        return AlertAcceptedResponse.builder()
                .status("ACCEPTED")
                .message("Alert accepted for background processing")
                .correlationId(correlationId)
                .timestamp(timestamp)
                .build();
    }
}


package com.svp.stockai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertRequest {

    @NotBlank(message = "Alert type is required")
    private String alertType;

    @NotNull(message = "Severity is required")
    private AlertSeverity severity;

    @NotBlank(message = "Message is required")
    private String message;

    private String sourceType;

    private String sourceId;

    private Long machineId;

    private Instant timestamp;

    private String correlationId;
}


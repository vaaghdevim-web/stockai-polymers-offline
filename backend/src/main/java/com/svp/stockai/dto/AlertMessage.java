package com.svp.stockai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.Instant;

@Getter
@Setter
@Builder
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class AlertMessage {

    private String correlationId;
    private String alertType;
    private AlertSeverity severity;
    private String message;
    private String sourceType;
    private String sourceId;
    private Long machineId;
    private Instant timestamp;
}


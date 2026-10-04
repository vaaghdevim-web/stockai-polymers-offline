package com.svp.stockai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MachineAnomalyDto {
    private String anomalyType; // TemperatureHigh, PressureHigh, MachineStopped, TelemetryOffline, QualityAnomaly
    private String severity;    // Low, Medium, High, Critical
    private String machineCode;
    private String parameterName;
    private String thresholdValue;
    private String observedValue;
    private String message;
    private Instant detectedAt;
}

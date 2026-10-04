package com.svp.stockai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TelemetryStreamEvent {
    private String eventId;
    private String eventType; // TELEMETRY_INGESTED, ANOMALY_DETECTED, MACHINE_STATUS_CHANGED
    private TelemetryPacketRequest telemetry;
    private List<MachineAnomalyDto> anomalies;
    private Instant publishedAt;
}

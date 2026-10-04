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
public class TelemetryIngestResponse {
    private String status; // ACCEPTED, PARTIAL_SUCCESS, ANOMALIES_DETECTED
    private int processedCount;
    private int acceptedCount;
    private int anomalyCount;
    private long ingestLatencyMs;
    private List<MachineAnomalyDto> anomalies;
    private Instant ingestedAt;
}

package com.svp.stockai.service;

import com.svp.stockai.dto.TelemetryStreamEvent;

/**
 * Extension hook interface for downstream telemetry consumers.
 * Eng 2 (Redis active machine caching) and Eng 3 (Async alerting workers)
 * implement this interface to consume telemetry events asynchronously.
 */
public interface TelemetryEventListener {

    /**
     * Called whenever a telemetry packet or batch is ingested and processed.
     *
     * @param event The enriched telemetry stream event containing sensor data and detected anomalies.
     */
    void onTelemetryEvent(TelemetryStreamEvent event);

    /**
     * Optional filter predicate: return true if this listener wants to receive events for the specified machine.
     * Default implementation accepts all machines.
     */
    default boolean supports(String machineCode) {
        return true;
    }
}

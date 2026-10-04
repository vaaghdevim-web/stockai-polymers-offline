package com.svp.stockai.controller;

import com.svp.stockai.dto.TelemetryBurstRequest;
import com.svp.stockai.dto.TelemetryIngestResponse;
import com.svp.stockai.dto.TelemetryPacketRequest;
import com.svp.stockai.dto.TelemetryStreamEvent;
import com.svp.stockai.service.IoTTelemetryIngestionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/iot/telemetry")
@RequiredArgsConstructor
public class IoTTelemetryController {

    private final IoTTelemetryIngestionService ingestionService;

    @PostMapping("/packet")
    @PreAuthorize("hasAnyRole('OPERATOR', 'ADMIN', 'SUPERVISOR', 'MACHINE')")
    public ResponseEntity<TelemetryIngestResponse> ingestPacket(@Valid @RequestBody TelemetryPacketRequest packet) {
        validateMachineAuthorization(packet.getMachineCode());
        TelemetryIngestResponse response = ingestionService.ingestPacket(packet);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @PostMapping("/burst")
    @PreAuthorize("hasAnyRole('OPERATOR', 'ADMIN', 'SUPERVISOR', 'MACHINE')")
    public ResponseEntity<TelemetryIngestResponse> ingestBurst(@Valid @RequestBody TelemetryBurstRequest burst) {
        if (burst.getPackets() != null) {
            for (TelemetryPacketRequest p : burst.getPackets()) {
                if (p != null && p.getMachineCode() != null) {
                    validateMachineAuthorization(p.getMachineCode());
                }
            }
        }
        TelemetryIngestResponse response = ingestionService.ingestBurst(burst);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @GetMapping("/latest/{machineCode}")
    @PreAuthorize("hasAnyRole('OPERATOR', 'ADMIN', 'SUPERVISOR', 'MACHINE')")
    public ResponseEntity<TelemetryPacketRequest> getLatestReading(@PathVariable String machineCode) {
        validateMachineAuthorization(machineCode);
        return ingestionService.getLatestReading(machineCode)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No telemetry data recorded for machine: " + machineCode));
    }

    @GetMapping("/recent")
    @PreAuthorize("hasAnyRole('OPERATOR', 'ADMIN', 'SUPERVISOR', 'MACHINE')")
    public ResponseEntity<List<TelemetryStreamEvent>> getRecentEvents(@RequestParam(defaultValue = "20") int limit) {
        List<TelemetryStreamEvent> events = ingestionService.getRecentEvents(limit);
        return ResponseEntity.ok(events);
    }

    private void validateMachineAuthorization(String targetMachineCode) {
        org.springframework.security.core.Authentication auth =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null && auth.getName().startsWith("DEVICE:")) {
            String deviceId = auth.getName().substring(7).trim();
            if (!deviceId.equalsIgnoreCase(targetMachineCode) &&
                    !deviceId.toUpperCase().startsWith("GW-") &&
                    !deviceId.toUpperCase().startsWith("GATEWAY-") &&
                    !deviceId.toUpperCase().startsWith("EDGE-")) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Device [" + deviceId + "] is not authorized to submit telemetry for machine [" + targetMachineCode + "]"
                );
            }
        }
    }
}

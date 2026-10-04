package com.svp.stockai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TelemetryPacketRequest {

    @NotBlank(message = "machineCode is required")
    private String machineCode;

    private Long plantId;

    private String unit; // Unit 1, Unit 2, Unit 3

    private String machineType; // Extruder, Loom, Lamination, BCS

    // Temperature Zones (in °C)
    private BigDecimal zone1Temp;
    private BigDecimal zone2Temp;
    private BigDecimal zone3Temp;
    private BigDecimal zone4Temp;
    private BigDecimal zone5Temp;
    private BigDecimal zone6Temp;
    private BigDecimal dieTemp;

    // Pressure & Speed Metrics
    private BigDecimal meltPressureBar;
    private BigDecimal screwRpm;
    private BigDecimal lineSpeedMpm; // meters per minute
    private Integer loomPpm;        // picks per minute for circular looms
    private BigDecimal activePowerKw;

    // Quality & Dimensional Metrics
    private BigDecimal gsmMeasured;
    private BigDecimal denierDeviation;
    private BigDecimal tapeWidthMm;

    // Machine Operational State
    @NotBlank(message = "machineStatus is required")
    private String machineStatus; // RUNNING, IDLE, WARNING, FAULT, EMERGENCY_STOP

    // Operational Constraints & Edge Tracking
    private Long sequenceNumber;

    // Edge Metadata
    @NotNull(message = "packetTimestamp is required")
    private Instant packetTimestamp;

    private String sensorFirmwareVersion;
    private String crcCheck;
}

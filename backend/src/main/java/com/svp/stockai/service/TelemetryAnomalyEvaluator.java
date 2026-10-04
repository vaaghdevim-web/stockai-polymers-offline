package com.svp.stockai.service;

import com.svp.stockai.dto.MachineAnomalyDto;
import com.svp.stockai.dto.TelemetryPacketRequest;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Component
public class TelemetryAnomalyEvaluator {

    public static final BigDecimal MAX_DIE_TEMP_CELSIUS = new BigDecimal("265.0");
    public static final BigDecimal MAX_ZONE_TEMP_CELSIUS = new BigDecimal("260.0");
    public static final BigDecimal MAX_MELT_PRESSURE_BAR = new BigDecimal("180.0");
    public static final BigDecimal MIN_OPERATIONAL_LINE_SPEED = new BigDecimal("1.0");
    public static final BigDecimal MOTOR_POWER_IDLE_THRESHOLD = new BigDecimal("5.0");
    public static final BigDecimal MAX_DENIER_DEVIATION_PCT = new BigDecimal("10.0");

    public List<MachineAnomalyDto> evaluate(TelemetryPacketRequest packet) {
        List<MachineAnomalyDto> anomalies = new ArrayList<>();
        Instant now = Instant.now();
        String machineCode = packet.getMachineCode();

        // 1. Die Temperature Threshold Evaluation
        if (packet.getDieTemp() != null && packet.getDieTemp().compareTo(MAX_DIE_TEMP_CELSIUS) > 0) {
            anomalies.add(MachineAnomalyDto.builder()
                    .anomalyType("TemperatureHigh")
                    .severity("Critical")
                    .machineCode(machineCode)
                    .parameterName("dieTemp")
                    .thresholdValue(MAX_DIE_TEMP_CELSIUS + " °C")
                    .observedValue(packet.getDieTemp() + " °C")
                    .message("Extruder die temperature exceeded critical limit (" + packet.getDieTemp() + " °C > " + MAX_DIE_TEMP_CELSIUS + " °C)")
                    .detectedAt(now)
                    .build());
        }

        // 2. Zone Temperature Threshold Evaluation (Z1 - Z6)
        checkZoneTemp(packet.getZone1Temp(), "zone1Temp", machineCode, anomalies, now);
        checkZoneTemp(packet.getZone2Temp(), "zone2Temp", machineCode, anomalies, now);
        checkZoneTemp(packet.getZone3Temp(), "zone3Temp", machineCode, anomalies, now);
        checkZoneTemp(packet.getZone4Temp(), "zone4Temp", machineCode, anomalies, now);
        checkZoneTemp(packet.getZone5Temp(), "zone5Temp", machineCode, anomalies, now);
        checkZoneTemp(packet.getZone6Temp(), "zone6Temp", machineCode, anomalies, now);

        // 3. Melt Pressure Breach
        if (packet.getMeltPressureBar() != null && packet.getMeltPressureBar().compareTo(MAX_MELT_PRESSURE_BAR) > 0) {
            anomalies.add(MachineAnomalyDto.builder()
                    .anomalyType("PressureHigh")
                    .severity("Critical")
                    .machineCode(machineCode)
                    .parameterName("meltPressureBar")
                    .thresholdValue(MAX_MELT_PRESSURE_BAR + " bar")
                    .observedValue(packet.getMeltPressureBar() + " bar")
                    .message("Extruder melt pressure breached safety limit (" + packet.getMeltPressureBar() + " bar > " + MAX_MELT_PRESSURE_BAR + " bar)")
                    .detectedAt(now)
                    .build());
        }

        // 4. Motor Stall / Line Jam Check (High power draw with 0 line speed)
        if ("RUNNING".equalsIgnoreCase(packet.getMachineStatus())) {
            if (packet.getActivePowerKw() != null && packet.getActivePowerKw().compareTo(MOTOR_POWER_IDLE_THRESHOLD) > 0
                    && packet.getLineSpeedMpm() != null && packet.getLineSpeedMpm().compareTo(MIN_OPERATIONAL_LINE_SPEED) < 0) {
                anomalies.add(MachineAnomalyDto.builder()
                        .anomalyType("MachineFault")
                        .severity("High")
                        .machineCode(machineCode)
                        .parameterName("lineSpeedMpm")
                        .thresholdValue(">= " + MIN_OPERATIONAL_LINE_SPEED + " m/min while powered")
                        .observedValue(packet.getLineSpeedMpm() + " m/min (Power: " + packet.getActivePowerKw() + " kW)")
                        .message("Potential line jam detected: high motor power with zero line speed")
                        .detectedAt(now)
                        .build());
            }
        }

        // 5. Emergency Stop / Fault State
        if ("FAULT".equalsIgnoreCase(packet.getMachineStatus()) || "EMERGENCY_STOP".equalsIgnoreCase(packet.getMachineStatus())) {
            anomalies.add(MachineAnomalyDto.builder()
                    .anomalyType("MachineStopped")
                    .severity("Critical")
                    .machineCode(machineCode)
                    .parameterName("machineStatus")
                    .thresholdValue("RUNNING / IDLE")
                    .observedValue(packet.getMachineStatus())
                    .message("Machine reported " + packet.getMachineStatus() + " state from edge PLC")
                    .detectedAt(now)
                    .build());
        }

        // 6. Denier Quality Deviation Check
        if (packet.getDenierDeviation() != null && packet.getDenierDeviation().abs().compareTo(MAX_DENIER_DEVIATION_PCT) > 0) {
            anomalies.add(MachineAnomalyDto.builder()
                    .anomalyType("QualityAnomaly")
                    .severity("Medium")
                    .machineCode(machineCode)
                    .parameterName("denierDeviation")
                    .thresholdValue("±" + MAX_DENIER_DEVIATION_PCT + " %")
                    .observedValue(packet.getDenierDeviation() + " %")
                    .message("Tape denier deviation exceeded tolerance (" + packet.getDenierDeviation() + " %)")
                    .detectedAt(now)
                    .build());
        }

        return anomalies;
    }

    private void checkZoneTemp(BigDecimal temp, String zoneName, String machineCode, List<MachineAnomalyDto> anomalies, Instant now) {
        if (temp != null && temp.compareTo(MAX_ZONE_TEMP_CELSIUS) > 0) {
            anomalies.add(MachineAnomalyDto.builder()
                    .anomalyType("TemperatureHigh")
                    .severity("High")
                    .machineCode(machineCode)
                    .parameterName(zoneName)
                    .thresholdValue(MAX_ZONE_TEMP_CELSIUS + " °C")
                    .observedValue(temp + " °C")
                    .message("Extruder " + zoneName + " exceeded threshold (" + temp + " °C > " + MAX_ZONE_TEMP_CELSIUS + " °C)")
                    .detectedAt(now)
                    .build());
        }
    }
}

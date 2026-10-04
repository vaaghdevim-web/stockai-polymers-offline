package com.svp.stockai.service;

import com.svp.stockai.dto.MachineAnomalyDto;
import com.svp.stockai.dto.TelemetryPacketRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("TelemetryAnomalyEvaluator Unit Tests")
class TelemetryAnomalyEvaluatorTest {

    private TelemetryAnomalyEvaluator evaluator;

    @BeforeEach
    void setUp() {
        evaluator = new TelemetryAnomalyEvaluator();
    }

    @Test
    @DisplayName("Should detect no anomalies for normal running extruder telemetry")
    void testNormalRunningTelemetry_NoAnomalies() {
        TelemetryPacketRequest packet = TelemetryPacketRequest.builder()
                .machineCode("EXT-01")
                .unit("Unit 1")
                .machineStatus("RUNNING")
                .dieTemp(new BigDecimal("240.0"))
                .zone1Temp(new BigDecimal("220.0"))
                .zone2Temp(new BigDecimal("230.0"))
                .zone3Temp(new BigDecimal("235.0"))
                .zone4Temp(new BigDecimal("238.0"))
                .zone5Temp(new BigDecimal("240.0"))
                .zone6Temp(new BigDecimal("242.0"))
                .meltPressureBar(new BigDecimal("145.0"))
                .screwRpm(new BigDecimal("85.0"))
                .lineSpeedMpm(new BigDecimal("420.0"))
                .activePowerKw(new BigDecimal("75.0"))
                .denierDeviation(new BigDecimal("1.5"))
                .packetTimestamp(Instant.now())
                .build();

        List<MachineAnomalyDto> anomalies = evaluator.evaluate(packet);
        assertTrue(anomalies.isEmpty(), "Normal telemetry should not produce anomalies");
    }

    @Test
    @DisplayName("Should flag critical anomaly when die temperature exceeds 265°C")
    void testDieTemperatureExceeded() {
        TelemetryPacketRequest packet = TelemetryPacketRequest.builder()
                .machineCode("EXT-01")
                .machineStatus("RUNNING")
                .dieTemp(new BigDecimal("272.5"))
                .meltPressureBar(new BigDecimal("140.0"))
                .lineSpeedMpm(new BigDecimal("400.0"))
                .packetTimestamp(Instant.now())
                .build();

        List<MachineAnomalyDto> anomalies = evaluator.evaluate(packet);
        assertEquals(1, anomalies.size());
        MachineAnomalyDto anomaly = anomalies.get(0);
        assertEquals("TemperatureHigh", anomaly.getAnomalyType());
        assertEquals("Critical", anomaly.getSeverity());
        assertEquals("dieTemp", anomaly.getParameterName());
    }

    @Test
    @DisplayName("Should flag critical anomaly when melt pressure breaches 180 bar")
    void testMeltPressureBreach() {
        TelemetryPacketRequest packet = TelemetryPacketRequest.builder()
                .machineCode("EXT-02")
                .machineStatus("RUNNING")
                .meltPressureBar(new BigDecimal("192.0"))
                .lineSpeedMpm(new BigDecimal("400.0"))
                .packetTimestamp(Instant.now())
                .build();

        List<MachineAnomalyDto> anomalies = evaluator.evaluate(packet);
        assertEquals(1, anomalies.size());
        assertEquals("PressureHigh", anomalies.get(0).getAnomalyType());
        assertEquals("Critical", anomalies.get(0).getSeverity());
    }

    @Test
    @DisplayName("Should detect line jam when motor has high power draw but line speed is zero")
    void testLineJamMotorStall() {
        TelemetryPacketRequest packet = TelemetryPacketRequest.builder()
                .machineCode("EXT-01")
                .machineStatus("RUNNING")
                .activePowerKw(new BigDecimal("45.0"))
                .lineSpeedMpm(new BigDecimal("0.0"))
                .packetTimestamp(Instant.now())
                .build();

        List<MachineAnomalyDto> anomalies = evaluator.evaluate(packet);
        assertEquals(1, anomalies.size());
        assertEquals("MachineFault", anomalies.get(0).getAnomalyType());
        assertEquals("High", anomalies.get(0).getSeverity());
        assertTrue(anomalies.get(0).getMessage().contains("line jam"));
    }

    @Test
    @DisplayName("Should flag quality anomaly when denier deviation exceeds 10%")
    void testDenierQualityDeviation() {
        TelemetryPacketRequest packet = TelemetryPacketRequest.builder()
                .machineCode("EXT-01")
                .machineStatus("RUNNING")
                .denierDeviation(new BigDecimal("-12.4"))
                .lineSpeedMpm(new BigDecimal("400.0"))
                .packetTimestamp(Instant.now())
                .build();

        List<MachineAnomalyDto> anomalies = evaluator.evaluate(packet);
        assertEquals(1, anomalies.size());
        assertEquals("QualityAnomaly", anomalies.get(0).getAnomalyType());
        assertEquals("Medium", anomalies.get(0).getSeverity());
    }

    @Test
    @DisplayName("Should detect emergency stop status")
    void testEmergencyStopStatus() {
        TelemetryPacketRequest packet = TelemetryPacketRequest.builder()
                .machineCode("LOOM-07")
                .machineStatus("EMERGENCY_STOP")
                .packetTimestamp(Instant.now())
                .build();

        List<MachineAnomalyDto> anomalies = evaluator.evaluate(packet);
        assertEquals(1, anomalies.size());
        assertEquals("MachineStopped", anomalies.get(0).getAnomalyType());
        assertEquals("Critical", anomalies.get(0).getSeverity());
    }
}

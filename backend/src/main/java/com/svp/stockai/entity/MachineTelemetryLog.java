package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.OffsetDateTime;

@Entity
@Table(name = "machine_telemetry_log", indexes = {
    @Index(name = "idx_telemetry_log_mch_time", columnList = "machine_code, packet_timestamp"),
    @Index(name = "idx_telemetry_log_time", columnList = "packet_timestamp")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MachineTelemetryLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id", nullable = false)
    private Long logId;

    @Column(name = "machine_code", nullable = false, length = 50)
    private String machineCode;

    @Column(name = "unit_name", length = 50)
    private String unit;

    @Column(name = "machine_type", length = 50)
    private String machineType;

    @Column(name = "sequence_number")
    private Long sequenceNumber;

    @Column(name = "machine_status", nullable = false, length = 30)
    private String machineStatus;

    @Column(name = "zone1_temp", precision = 8, scale = 2)
    private BigDecimal zone1Temp;

    @Column(name = "zone2_temp", precision = 8, scale = 2)
    private BigDecimal zone2Temp;

    @Column(name = "zone3_temp", precision = 8, scale = 2)
    private BigDecimal zone3Temp;

    @Column(name = "zone4_temp", precision = 8, scale = 2)
    private BigDecimal zone4Temp;

    @Column(name = "zone5_temp", precision = 8, scale = 2)
    private BigDecimal zone5Temp;

    @Column(name = "zone6_temp", precision = 8, scale = 2)
    private BigDecimal zone6Temp;

    @Column(name = "die_temp", precision = 8, scale = 2)
    private BigDecimal dieTemp;

    @Column(name = "melt_pressure_bar", precision = 8, scale = 2)
    private BigDecimal meltPressureBar;

    @Column(name = "screw_rpm", precision = 8, scale = 2)
    private BigDecimal screwRpm;

    @Column(name = "line_speed_mpm", precision = 8, scale = 2)
    private BigDecimal lineSpeedMpm;

    @Column(name = "loom_ppm")
    private Integer loomPpm;

    @Column(name = "active_power_kw", precision = 8, scale = 2)
    private BigDecimal activePowerKw;

    @Column(name = "gsm_measured", precision = 8, scale = 2)
    private BigDecimal gsmMeasured;

    @Column(name = "denier_deviation", precision = 8, scale = 2)
    private BigDecimal denierDeviation;

    @Column(name = "tape_width_mm", precision = 8, scale = 2)
    private BigDecimal tapeWidthMm;

    @Column(name = "anomaly_count")
    @Builder.Default
    private Integer anomalyCount = 0;

    @Column(name = "packet_timestamp", nullable = false)
    private Instant packetTimestamp;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}

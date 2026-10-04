package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "production_stage", uniqueConstraints = {
    @UniqueConstraint(name = "uq_production_stage_sequence", columnNames = {"production_id", "sequence_no"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductionStage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "stage_id", nullable = false)
    private Long stageId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "production_id", nullable = false)
    private ProductionRun productionRun;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_id", nullable = false)
    private ProductionUnit unit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "machine_id")
    private Machine machine;

    @Column(name = "sequence_no", nullable = false)
    private Integer sequenceNo;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "Pending"; // 'Pending','Ready','Running','Completed','Blocked','Failed','Cancelled'

    @Column(name = "input_weight_kg", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal inputWeightKg = BigDecimal.ZERO;

    @Column(name = "output_weight_kg", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal outputWeightKg = BigDecimal.ZERO;

    @Column(name = "scrap_weight_kg", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal scrapWeightKg = BigDecimal.ZERO;

    @Column(name = "started_at")
    private OffsetDateTime startedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}

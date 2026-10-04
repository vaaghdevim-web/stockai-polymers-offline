package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "unit_operation")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UnitOperation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "operation_id", nullable = false)
    private Long operationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "production_id", nullable = false)
    private ProductionRun productionRun;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id")
    private ProductionStage stage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_id", nullable = false)
    private ProductionUnit unit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "machine_id")
    private Machine machine;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "compounding_batch_id")
    private CompoundingBatch compoundingBatch;

    @Column(name = "operation_type", nullable = false, length = 30)
    @Builder.Default
    private String operationType = "Production";

    @Column(name = "input_weight_kg", nullable = false, precision = 18, scale = 4)
    private BigDecimal inputWeightKg;

    @Column(name = "output_weight_kg", nullable = false, precision = 18, scale = 4)
    private BigDecimal outputWeightKg;

    @Column(name = "scrap_weight_kg", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal scrapWeightKg = BigDecimal.ZERO;

    @CreationTimestamp
    @Column(name = "logged_at", nullable = false, updatable = false)
    private OffsetDateTime loggedAt;

    @Column(name = "started_at")
    private OffsetDateTime startedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private AppUser createdBy;
}

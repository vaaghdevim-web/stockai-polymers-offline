package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "production_run", uniqueConstraints = {
    @UniqueConstraint(name = "production_run_production_number_key", columnNames = {"production_number"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductionRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "production_id", nullable = false)
    private Long productionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plant_id", nullable = false)
    private Plant plant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bom_id", nullable = false)
    private Bom bom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "compounding_batch_id")
    private CompoundingBatch compoundingBatch;

    @Column(name = "production_number", nullable = false, length = 50, unique = true)
    private String productionNumber;

    @Column(name = "start_datetime")
    private OffsetDateTime startDatetime;

    @Column(name = "end_datetime")
    private OffsetDateTime endDatetime;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "Planned"; // 'Planned','InProgress','Completed','Cancelled','Blocked'

    @Column(name = "planned_qty", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal plannedQty = BigDecimal.ZERO;

    @Column(name = "actual_qty", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal actualQty = BigDecimal.ZERO;

    @Column(name = "input_weight_kg", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal inputWeightKg = BigDecimal.ZERO;

    @Column(name = "output_weight_kg", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal outputWeightKg = BigDecimal.ZERO;

    @Column(name = "scrap_weight_kg", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal scrapWeightKg = BigDecimal.ZERO;

    @Column(name = "yield_percentage", precision = 7, scale = 3)
    private BigDecimal yieldPercentage;

    @Column(name = "bags_produced", precision = 18, scale = 4)
    private BigDecimal bagsProduced;

    @Column(name = "bags_per_kg", precision = 18, scale = 4)
    private BigDecimal bagsPerKg;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private AppUser createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}

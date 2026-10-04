package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "finished_batch", uniqueConstraints = {
    @UniqueConstraint(name = "finished_batch_batch_no_key", columnNames = {"batch_no"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FinishedBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "finished_batch_id", nullable = false)
    private Long finishedBatchId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private FinishedProduct product;

    @Column(name = "batch_no", nullable = false, length = 80, unique = true)
    private String batchNo;

    @Column(name = "production_date", nullable = false)
    private LocalDate productionDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "qty_produced", nullable = false, precision = 18, scale = 4)
    private BigDecimal qtyProduced;

    @Column(name = "qty_rejected", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal qtyRejected = BigDecimal.ZERO;

    @Column(name = "input_weight_kg", precision = 18, scale = 4)
    private BigDecimal inputWeightKg;

    @Column(name = "output_weight_kg", precision = 18, scale = 4)
    private BigDecimal outputWeightKg;

    @Column(name = "scrap_weight_kg", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal scrapWeightKg = BigDecimal.ZERO;

    @Column(name = "bags_produced", precision = 18, scale = 4)
    private BigDecimal bagsProduced;

    @Column(name = "average_bag_weight_g", precision = 18, scale = 4)
    private BigDecimal averageBagWeightG;

    @Column(name = "bags_per_kg", precision = 18, scale = 4)
    private BigDecimal bagsPerKg;

    @Column(name = "quality_status", nullable = false, length = 30)
    @Builder.Default
    private String qualityStatus = "Hold"; // 'Hold','Available','Rejected','Quarantine','Released'

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}

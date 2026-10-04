package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "compounding_batch", uniqueConstraints = {
    @UniqueConstraint(name = "compounding_batch_batch_code_key", columnNames = {"batch_code"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompoundingBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "compounding_batch_id", nullable = false)
    private Long compoundingBatchId;

    @Column(name = "batch_code", nullable = false, length = 80, unique = true)
    private String batchCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "compounding_bom_id", nullable = false)
    private CompoundingBom compoundingBom;

    @Column(name = "target_weight_kg", nullable = false, precision = 18, scale = 4)
    private BigDecimal targetWeightKg;

    @Column(name = "actual_weight_kg", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal actualWeightKg = BigDecimal.ZERO;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "Planned"; // 'Planned','InProgress','Completed','Hold','Rejected','Cancelled'

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private AppUser createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;
}

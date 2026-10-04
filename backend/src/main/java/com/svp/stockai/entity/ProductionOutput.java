package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "production_output", uniqueConstraints = {
    @UniqueConstraint(name = "production_output_finished_batch_id_key", columnNames = {"finished_batch_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductionOutput {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "output_id", nullable = false)
    private Long outputId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "production_id", nullable = false)
    private ProductionRun productionRun;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "finished_batch_id", nullable = false, unique = true)
    private FinishedBatch finishedBatch;

    @Column(name = "produced_qty", nullable = false, precision = 18, scale = 4)
    private BigDecimal producedQty;

    @Column(name = "output_weight_kg", precision = 18, scale = 4)
    private BigDecimal outputWeightKg;

    @Column(name = "output_bags", precision = 18, scale = 4)
    private BigDecimal outputBags;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}

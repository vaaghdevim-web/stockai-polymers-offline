package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "rejection_record")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RejectionRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rejection_id", nullable = false)
    private Long rejectionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspection_id", nullable = false)
    private QualityInspection inspection;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_batch_id")
    private MaterialBatch materialBatch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "finished_batch_id")
    private FinishedBatch finishedBatch;

    @Column(name = "rejection_qty", nullable = false, precision = 18, scale = 4)
    private BigDecimal rejectionQty;

    @Column(name = "reason", nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "disposition", nullable = false, length = 20)
    private String disposition; // 'Reuse','Return','Scrap','Rework'

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}

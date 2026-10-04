package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "quality_inspection")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QualityInspection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "inspection_id", nullable = false)
    private Long inspectionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_batch_id")
    private MaterialBatch materialBatch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "production_id")
    private ProductionRun productionRun;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "finished_batch_id")
    private FinishedBatch finishedBatch;

    @Column(name = "inspection_type", nullable = false, length = 20)
    private String inspectionType; // 'Incoming','InProcess','Final'

    @Column(name = "inspection_date", nullable = false)
    @Builder.Default
    private OffsetDateTime inspectionDate = OffsetDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspected_by")
    private AppUser inspectedBy;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "Pass"; // 'Pass','Fail','Partial','Pending'

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;
}

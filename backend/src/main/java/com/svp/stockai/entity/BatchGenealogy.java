package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "batch_genealogy")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BatchGenealogy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "genealogy_id", nullable = false)
    private Long genealogyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "finished_batch_id", nullable = false)
    private FinishedBatch finishedBatch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "raw_material_batch_id")
    private MaterialBatch rawMaterialBatch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "compounding_batch_id")
    private CompoundingBatch compoundingBatch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "production_id", nullable = false)
    private ProductionRun productionRun;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_operation_id")
    private UnitOperation unitOperation;

    @Column(name = "quantity_consumed", nullable = false, precision = 18, scale = 4)
    private BigDecimal quantityConsumed;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quantity_uom_id")
    private UnitOfMeasure quantityUom;
}

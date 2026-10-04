package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "compounding_batch_material", uniqueConstraints = {
    @UniqueConstraint(name = "uq_compounding_batch_material", columnNames = {"compounding_batch_id", "material_batch_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompoundingBatchMaterial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "compounding_batch_material_id", nullable = false)
    private Long compoundingBatchMaterialId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "compounding_batch_id", nullable = false)
    private CompoundingBatch compoundingBatch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_batch_id", nullable = false)
    private MaterialBatch materialBatch;

    @Column(name = "required_qty_kg", nullable = false, precision = 18, scale = 4)
    private BigDecimal requiredQtyKg;

    @Column(name = "consumed_qty_kg", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal consumedQtyKg = BigDecimal.ZERO;
}

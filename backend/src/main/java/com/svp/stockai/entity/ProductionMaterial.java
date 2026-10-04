package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "production_material")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductionMaterial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pm_id", nullable = false)
    private Long pmId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "production_id", nullable = false)
    private ProductionRun productionRun;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id", nullable = false)
    private MaterialBatch materialBatch;

    @Column(name = "required_qty", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal requiredQty = BigDecimal.ZERO;

    @Column(name = "issued_qty", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal issuedQty = BigDecimal.ZERO;

    @Column(name = "wastage_qty", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal wastageQty = BigDecimal.ZERO;
}

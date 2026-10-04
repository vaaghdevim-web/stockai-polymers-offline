package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "bom_item", uniqueConstraints = {
    @UniqueConstraint(name = "uq_bom_material", columnNames = {"bom_id", "material_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BomItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "bom_item_id", nullable = false)
    private Long bomItemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bom_id", nullable = false)
    private Bom bom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_id", nullable = false)
    private RawMaterial material;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uom_id", nullable = false)
    private UnitOfMeasure uom;

    @Column(name = "quantity", nullable = false, precision = 18, scale = 4)
    private BigDecimal quantity;

    @Column(name = "scrap_percentage", nullable = false, precision = 7, scale = 3)
    @Builder.Default
    private BigDecimal scrapPercentage = BigDecimal.ZERO;

    @Column(name = "is_optional", nullable = false)
    @Builder.Default
    private Boolean isOptional = false;
}

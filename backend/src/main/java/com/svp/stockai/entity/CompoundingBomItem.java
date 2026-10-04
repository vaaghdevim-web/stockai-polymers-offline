package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "compounding_bom_item", uniqueConstraints = {
    @UniqueConstraint(name = "uq_compounding_bom_material", columnNames = {"compounding_bom_id", "material_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompoundingBomItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "compounding_bom_item_id", nullable = false)
    private Long compoundingBomItemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "compounding_bom_id", nullable = false)
    private CompoundingBom compoundingBom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_id", nullable = false)
    private RawMaterial material;

    @Column(name = "percentage", nullable = false, precision = 7, scale = 4)
    private BigDecimal percentage;

    @Column(name = "target_quantity_kg", nullable = false, precision = 18, scale = 4)
    private BigDecimal targetQuantityKg;

    @Column(name = "is_required", nullable = false)
    @Builder.Default
    private Boolean isRequired = true;
}

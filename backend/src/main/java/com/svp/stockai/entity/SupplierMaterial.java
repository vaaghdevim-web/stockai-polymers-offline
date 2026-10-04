package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "supplier_material", uniqueConstraints = {
    @UniqueConstraint(name = "uq_supplier_material", columnNames = {"supplier_id", "material_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupplierMaterial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "supplier_material_id", nullable = false)
    private Long supplierMaterialId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id", nullable = false)
    private Supplier supplier;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_id", nullable = false)
    private RawMaterial material;

    @Column(name = "purchase_rate", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal purchaseRate = BigDecimal.ZERO;

    @Column(name = "lead_time_days", nullable = false)
    @Builder.Default
    private Integer leadTimeDays = 0;

    @Column(name = "minimum_order_qty", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal minimumOrderQty = BigDecimal.ZERO;

    @Column(name = "is_preferred", nullable = false)
    @Builder.Default
    private Boolean isPreferred = false;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}

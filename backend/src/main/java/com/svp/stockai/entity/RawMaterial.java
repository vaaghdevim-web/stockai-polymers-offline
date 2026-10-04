package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "raw_material", uniqueConstraints = {
    @UniqueConstraint(name = "raw_material_material_code_key", columnNames = {"material_code"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RawMaterial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "material_id", nullable = false)
    private Long materialId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private MaterialCategory category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "default_uom_id", nullable = false)
    private UnitOfMeasure defaultUom;

    @Column(name = "material_name", nullable = false, length = 150)
    private String materialName;

    @Column(name = "material_code", nullable = false, length = 50, unique = true)
    private String materialCode;

    @Column(name = "standard_cost", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal standardCost = BigDecimal.ZERO;

    @Column(name = "reorder_level", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal reorderLevel = BigDecimal.ZERO;

    @Column(name = "safety_stock", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal safetyStock = BigDecimal.ZERO;

    @Column(name = "lead_time_days", nullable = false)
    @Builder.Default
    private Integer leadTimeDays = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}

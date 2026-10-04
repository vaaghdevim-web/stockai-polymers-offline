package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "product_specification", uniqueConstraints = {
    @UniqueConstraint(name = "uq_product_spec_version", columnNames = {"product_id", "version"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductSpecification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "specification_id", nullable = false)
    private Long specificationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private FinishedProduct product;

    @Column(name = "version", nullable = false, length = 50)
    @Builder.Default
    private String version = "1.0";

    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "bag_capacity_kg", precision = 18, scale = 4)
    private BigDecimal bagCapacityKg;

    @Column(name = "bag_width_mm", precision = 18, scale = 4)
    private BigDecimal bagWidthMm;

    @Column(name = "bag_length_mm", precision = 18, scale = 4)
    private BigDecimal bagLengthMm;

    @Column(name = "target_empty_weight_g", precision = 18, scale = 4)
    private BigDecimal targetEmptyWeightG;

    @Column(name = "min_empty_weight_g", precision = 18, scale = 4)
    private BigDecimal minEmptyWeightG;

    @Column(name = "max_empty_weight_g", precision = 18, scale = 4)
    private BigDecimal maxEmptyWeightG;

    @Column(name = "target_gsm", precision = 18, scale = 4)
    private BigDecimal targetGsm;

    @Column(name = "min_gsm", precision = 18, scale = 4)
    private BigDecimal minGsm;

    @Column(name = "max_gsm", precision = 18, scale = 4)
    private BigDecimal maxGsm;

    @Column(name = "target_output_bags_per_kg", precision = 18, scale = 4)
    private BigDecimal targetOutputBagsPerKg;

    @Column(name = "min_output_bags_per_kg", precision = 18, scale = 4)
    private BigDecimal minOutputBagsPerKg;

    @Column(name = "max_output_bags_per_kg", precision = 18, scale = 4)
    private BigDecimal maxOutputBagsPerKg;

    @Column(name = "target_scrap_percentage", precision = 7, scale = 3)
    private BigDecimal targetScrapPercentage;

    @Column(name = "min_scrap_percentage", precision = 7, scale = 3)
    private BigDecimal minScrapPercentage;

    @Column(name = "max_scrap_percentage", precision = 7, scale = 3)
    private BigDecimal maxScrapPercentage;

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

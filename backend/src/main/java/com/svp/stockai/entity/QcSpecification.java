package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "qc_specification")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QcSpecification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "qc_specification_id", nullable = false)
    private Long qcSpecificationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private FinishedProduct product;

    @Column(name = "inspection_type", nullable = false, length = 20)
    private String inspectionType; // 'Incoming','InProcess','Final'

    @Column(name = "parameter_name", nullable = false, length = 150)
    private String parameterName;

    @Column(name = "minimum_value", precision = 18, scale = 6)
    private BigDecimal minimumValue;

    @Column(name = "maximum_value", precision = 18, scale = 6)
    private BigDecimal maximumValue;

    @Column(name = "target_value", precision = 18, scale = 6)
    private BigDecimal targetValue;

    @Column(name = "measurement_unit", length = 30)
    private String measurementUnit;

    @Column(name = "specification", columnDefinition = "TEXT")
    private String specification;

    @Column(name = "is_critical", nullable = false, columnDefinition = "BOOLEAN NOT NULL DEFAULT FALSE")
    @Builder.Default
    private Boolean isCritical = false;

    @Column(name = "is_active", nullable = false, columnDefinition = "BOOLEAN NOT NULL DEFAULT TRUE")
    @Builder.Default
    private Boolean isActive = true;
}

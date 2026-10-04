package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "quality_inspection_item")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QualityInspectionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "qi_id", nullable = false)
    private Long qiId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspection_id", nullable = false)
    private QualityInspection inspection;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "qc_specification_id")
    private QcSpecification qcSpecification;

    @Column(name = "parameter_name", nullable = false, length = 150)
    private String parameterName;

    @Column(name = "minimum_value", precision = 18, scale = 6)
    private BigDecimal minimumValue;

    @Column(name = "maximum_value", precision = 18, scale = 6)
    private BigDecimal maximumValue;

    @Column(name = "observed_value", precision = 18, scale = 6)
    private BigDecimal observedValue;

    @Column(name = "measurement_unit", length = 30)
    private String measurementUnit;

    @Column(name = "target_value", precision = 18, scale = 6)
    private BigDecimal targetValue;

    @Column(name = "specification", columnDefinition = "TEXT")
    private String specification;

    @Column(name = "result", length = 10)
    private String result; // 'Pass','Fail','Pending'

    @Column(name = "is_critical", nullable = false)
    @Builder.Default
    private Boolean isCritical = false;
}

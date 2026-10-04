package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "production_unit", uniqueConstraints = {
    @UniqueConstraint(name = "uq_production_unit_code", columnNames = {"unit_code"}),
    @UniqueConstraint(name = "uq_production_unit_plant_sequence", columnNames = {"plant_id", "sequence_no"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductionUnit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "unit_id", nullable = false)
    private Long unitId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plant_id", nullable = false)
    private Plant plant;

    @Column(name = "unit_code", nullable = false, length = 50, unique = true)
    private String unitCode;

    @Column(name = "unit_name", nullable = false, length = 100)
    private String unitName;

    @Column(name = "unit_type", nullable = false, length = 30)
    private String unitType; // 'Extrusion','Weaving','Conversion','Other'

    @Column(name = "sequence_no", nullable = false)
    private Integer sequenceNo;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}

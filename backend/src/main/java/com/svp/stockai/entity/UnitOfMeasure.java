package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "unit_of_measure", uniqueConstraints = {
    @UniqueConstraint(name = "unit_of_measure_uom_code_key", columnNames = {"uom_code"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UnitOfMeasure {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "uom_id", nullable = false)
    private Long uomId;

    @Column(name = "uom_code", nullable = false, length = 20, unique = true)
    private String uomCode;

    @Column(name = "uom_type", nullable = false, length = 30)
    private String uomType; // 'Weight', 'Quantity', 'Length', 'Area', 'Other'
}

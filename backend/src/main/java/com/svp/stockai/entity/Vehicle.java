package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "vehicle", uniqueConstraints = {
    @UniqueConstraint(name = "vehicle_vehicle_number_key", columnNames = {"vehicle_number"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "vehicle_id", nullable = false)
    private Long vehicleId;

    @Column(name = "vehicle_number", nullable = false, length = 50, unique = true)
    private String vehicleNumber;

    @Column(name = "vehicle_type", length = 50)
    private String vehicleType;

    @Column(name = "capacity", precision = 18, scale = 3)
    private BigDecimal capacity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "capacity_uom_id")
    private UnitOfMeasure capacityUom;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}

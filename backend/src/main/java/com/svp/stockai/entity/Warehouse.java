package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "warehouse", uniqueConstraints = {
    @UniqueConstraint(name = "uq_warehouse_plant_name", columnNames = {"plant_id", "warehouse_name"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Warehouse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "warehouse_id", nullable = false)
    private Long warehouseId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plant_id", nullable = false)
    private Plant plant;

    @Column(name = "warehouse_name", nullable = false, length = 150)
    private String warehouseName;

    @Column(name = "type", nullable = false, length = 20)
    private String type; // 'Raw', 'FG', 'Both'

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}

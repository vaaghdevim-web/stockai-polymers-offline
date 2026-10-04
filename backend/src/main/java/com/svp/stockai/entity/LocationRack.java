package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "location_rack", uniqueConstraints = {
    @UniqueConstraint(name = "uq_rack_warehouse_code", columnNames = {"warehouse_id", "rack_code"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LocationRack {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rack_id", nullable = false)
    private Long rackId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @Column(name = "rack_code", nullable = false, length = 50)
    private String rackCode;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}

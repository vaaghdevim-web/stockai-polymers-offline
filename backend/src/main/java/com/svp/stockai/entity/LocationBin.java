package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "location_bin", uniqueConstraints = {
    @UniqueConstraint(name = "uq_bin_shelf_code", columnNames = {"shelf_id", "bin_code"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LocationBin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "bin_id", nullable = false)
    private Long binId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shelf_id", nullable = false)
    private LocationShelf shelf;

    @Column(name = "bin_code", nullable = false, length = 50)
    private String binCode;

    @Column(name = "capacity_kg", nullable = false, precision = 18, scale = 4, columnDefinition = "NUMERIC(18,4) DEFAULT 5000.0000")
    @Builder.Default
    private BigDecimal capacityKg = new BigDecimal("5000.0000");

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}

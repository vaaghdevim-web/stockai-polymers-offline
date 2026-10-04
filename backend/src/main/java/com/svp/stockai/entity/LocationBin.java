package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

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

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}

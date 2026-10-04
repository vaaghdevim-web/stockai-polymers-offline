package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "location_shelf", uniqueConstraints = {
    @UniqueConstraint(name = "uq_shelf_rack_code", columnNames = {"rack_id", "shelf_code"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LocationShelf {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "shelf_id", nullable = false)
    private Long shelfId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rack_id", nullable = false)
    private LocationRack rack;

    @Column(name = "shelf_code", nullable = false, length = 50)
    private String shelfCode;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}

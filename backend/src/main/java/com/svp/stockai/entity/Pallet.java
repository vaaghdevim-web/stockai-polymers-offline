package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "pallet", uniqueConstraints = {
    @UniqueConstraint(name = "pallet_pallet_code_key", columnNames = {"pallet_code"}),
    @UniqueConstraint(name = "pallet_barcode_key", columnNames = {"barcode"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Pallet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pallet_id", nullable = false)
    private Long palletId;

    @Column(name = "pallet_code", nullable = false, length = 80, unique = true)
    private String palletCode;

    @Column(name = "barcode", nullable = false, length = 150, unique = true)
    private String barcode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id")
    private Warehouse warehouse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bin_id")
    private LocationBin bin;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "Open"; // 'Open','Stored','Allocated','Dispatched','Closed','Cancelled'

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private AppUser createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}

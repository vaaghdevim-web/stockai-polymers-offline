package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "inventory_reservation")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryReservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reservation_id", nullable = false)
    private Long reservationId;

    @Column(name = "order_item_id", nullable = false)
    private Long orderItemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_id", nullable = false)
    private Inventory inventory;

    @Column(name = "reserved_qty", nullable = false, precision = 18, scale = 4)
    private BigDecimal reservedQty;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "Active"; // 'Active','Released','Consumed','Cancelled'

    @Column(name = "reserved_at", nullable = false)
    @Builder.Default
    private OffsetDateTime reservedAt = OffsetDateTime.now();

    @Column(name = "released_at")
    private OffsetDateTime releasedAt;
}

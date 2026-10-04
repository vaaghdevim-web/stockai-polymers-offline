package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "inventory", uniqueConstraints = {
    @UniqueConstraint(name = "uq_inventory_material_bin", columnNames = {"material_batch_id", "bin_id"}),
    @UniqueConstraint(name = "uq_inventory_finished_bin", columnNames = {"finished_batch_id", "bin_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Inventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "inventory_id", nullable = false)
    private Long inventoryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_batch_id")
    private MaterialBatch materialBatch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "finished_batch_id")
    private FinishedBatch finishedBatch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bin_id", nullable = false)
    private LocationBin bin;

    @Column(name = "quantity_on_hand", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal quantityOnHand = BigDecimal.ZERO;

    @Column(name = "reserved_qty", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal reservedQty = BigDecimal.ZERO;

    @Column(name = "quality_status", length = 30)
    private String qualityStatus;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}

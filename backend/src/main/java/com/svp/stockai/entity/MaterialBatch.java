package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "material_batch", uniqueConstraints = {
    @UniqueConstraint(name = "material_batch_batch_no_key", columnNames = {"batch_no"}),
    @UniqueConstraint(name = "uq_material_batch_lot", columnNames = {"lot_number"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaterialBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "batch_id", nullable = false)
    private Long batchId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_id", nullable = false)
    private RawMaterial material;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "po_item_id")
    private PurchaseOrderItem purchaseOrderItem;

    @Column(name = "batch_no", nullable = false, length = 80, unique = true)
    private String batchNo;

    @Column(name = "lot_number", length = 80, unique = true)
    private String lotNumber;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "initial_weight_kg", precision = 18, scale = 4)
    private BigDecimal initialWeightKg;

    @Column(name = "current_weight_kg", precision = 18, scale = 4)
    private BigDecimal currentWeightKg;

    @Column(name = "unit_cost", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal unitCost = BigDecimal.ZERO;

    @Column(name = "received_at")
    private OffsetDateTime receivedAt;

    @Column(name = "quality_status", nullable = false, length = 20)
    @Builder.Default
    private String qualityStatus = "Available"; // 'Available','Hold','Quarantine','Rejected','Expired'

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "Available"; // 'Available','Hold','Quarantine','Rejected','Expired','Consumed','Closed'

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}

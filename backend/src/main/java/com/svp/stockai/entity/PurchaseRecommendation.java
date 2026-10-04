package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "purchase_recommendation")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "recommendation_id", nullable = false)
    private Long recommendationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_id", nullable = false)
    private RawMaterial material;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plant_id", nullable = false)
    private Plant plant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_material_id")
    private SupplierMaterial supplierMaterial;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "converted_po_id")
    private PurchaseOrder convertedPo;

    @Column(name = "recommended_date", nullable = false)
    @Builder.Default
    private LocalDate recommendedDate = LocalDate.now();

    @Column(name = "recommended_qty", nullable = false, precision = 18, scale = 4)
    private BigDecimal recommendedQty;

    @Column(name = "estimated_cost", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal estimatedCost = BigDecimal.ZERO;

    @Column(name = "safety_stock", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal safetyStock = BigDecimal.ZERO;

    @Column(name = "current_stock", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal currentStock = BigDecimal.ZERO;

    @Column(name = "lead_time_days", nullable = false)
    @Builder.Default
    private Integer leadTimeDays = 0;

    @Column(name = "priority", nullable = false, length = 20)
    @Builder.Default
    private String priority = "Medium"; // 'Low','Medium','High','Critical'

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "New"; // 'New','InReview','Approved','Converted','Rejected'

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private AppUser approvedBy;

    @Column(name = "approved_at")
    private OffsetDateTime approvedAt;
}

package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "compounding_bom", uniqueConstraints = {
    @UniqueConstraint(name = "uq_compounding_bom_code_version", columnNames = {"bom_code", "version"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompoundingBom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "compounding_bom_id", nullable = false)
    private Long compoundingBomId;

    @Column(name = "bom_code", nullable = false, length = 50)
    private String bomCode;

    @Column(name = "version", nullable = false, length = 50)
    private String version;

    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "target_batch_weight_kg", nullable = false, precision = 18, scale = 4)
    private BigDecimal targetBatchWeightKg;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "Draft"; // 'Draft','Active','Retired'

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private AppUser createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}

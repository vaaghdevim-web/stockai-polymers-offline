package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "bom", uniqueConstraints = {
    @UniqueConstraint(name = "uq_bom_product_version", columnNames = {"product_id", "version"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "bom_id", nullable = false)
    private Long bomId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private FinishedProduct product;

    @Column(name = "version", nullable = false, length = 50)
    private String version;

    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "yield_quantity", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal yieldQuantity = BigDecimal.ZERO;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "Draft"; // 'Draft','Active','Retired'
}

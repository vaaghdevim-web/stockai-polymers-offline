package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "stock_transfer", uniqueConstraints = {
    @UniqueConstraint(name = "stock_transfer_transfer_number_key", columnNames = {"transfer_number"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockTransfer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "transfer_id", nullable = false)
    private Long transferId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_warehouse_id", nullable = false)
    private Warehouse fromWarehouse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_warehouse_id", nullable = false)
    private Warehouse toWarehouse;

    @Column(name = "transfer_number", nullable = false, length = 50, unique = true)
    private String transferNumber;

    @Column(name = "transfer_date", nullable = false)
    @Builder.Default
    private LocalDate transferDate = LocalDate.now();

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "Draft"; // 'Draft','Completed','Cancelled'

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private AppUser createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}

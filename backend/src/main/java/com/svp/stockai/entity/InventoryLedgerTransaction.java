package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "inventory_ledger_transaction", uniqueConstraints = {
    @UniqueConstraint(name = "inventory_ledger_transaction_transaction_group_id_key", columnNames = {"transaction_group_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryLedgerTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ledger_transaction_id", nullable = false)
    private Long ledgerTransactionId;

    @Column(name = "transaction_group_id", nullable = false, unique = true)
    private UUID transactionGroupId;

    @Column(name = "transaction_type", nullable = false, length = 30)
    private String transactionType; // 'Purchase','Production','Transfer','Dispatch','Return','Scrap','Adjustment','Reservation','Release'

    @Column(name = "reference_type", length = 30)
    private String referenceType;

    @Column(name = "reference_id", length = 100)
    private String referenceId;

    @Column(name = "transaction_date", nullable = false)
    @Builder.Default
    private OffsetDateTime transactionDate = OffsetDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private AppUser createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}

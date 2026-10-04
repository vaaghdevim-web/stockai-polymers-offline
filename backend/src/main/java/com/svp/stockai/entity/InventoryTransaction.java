package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "inventory_transaction")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "transaction_id", nullable = false)
    private Long transactionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_id", nullable = false)
    private Inventory inventory;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_transfer_item_id")
    private StockTransferItem stockTransferItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "production_material_id")
    private ProductionMaterial productionMaterial;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "production_output_id")
    private ProductionOutput productionOutput;

    @Column(name = "dispatch_item_id")
    private Long dispatchItemId;

    @Column(name = "transaction_type", nullable = false, length = 30)
    private String transactionType; // 'Purchase','ProdConsumption','ProdOutput','TransferIn','TransferOut','SalesDispatch','Return','Scrap','Adjustment','Reservation','Release'

    @Column(name = "reference_type", length = 30)
    private String referenceType; // 'PO','Production','Dispatch','Transfer','Return','Other'

    @Column(name = "reference_id", length = 100)
    private String referenceId;

    @Column(name = "quantity", nullable = false, precision = 18, scale = 4)
    private BigDecimal quantity;

    @Column(name = "direction", nullable = false, length = 10)
    private String direction; // 'IN', 'OUT'

    @Column(name = "unit_cost", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal unitCost = BigDecimal.ZERO;

    @Column(name = "transaction_date", nullable = false)
    @Builder.Default
    private OffsetDateTime transactionDate = OffsetDateTime.now();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private AppUser createdBy;
}

package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "goods_receipt_item")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GoodsReceiptItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "gr_item_id", nullable = false)
    private Long grItemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gr_id", nullable = false)
    private GoodsReceipt goodsReceipt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "po_item_id", nullable = false)
    private PurchaseOrderItem purchaseOrderItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_id", nullable = false)
    private RawMaterial material;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uom_id", nullable = false)
    private UnitOfMeasure uom;

    @Column(name = "ordered_qty", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal orderedQty = BigDecimal.ZERO;

    @Column(name = "received_qty", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal receivedQty = BigDecimal.ZERO;

    @Column(name = "pending_qty", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal pendingQty = BigDecimal.ZERO;
}

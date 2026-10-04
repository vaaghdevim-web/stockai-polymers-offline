package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "customer_order_item")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_item_id", nullable = false)
    private Long orderItemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private CustomerOrder order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private FinishedProduct product;

    @Column(name = "ordered_qty", nullable = false, precision = 18, scale = 4)
    private BigDecimal orderedQty;

    @Column(name = "fulfilled_qty", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal fulfilledQty = BigDecimal.ZERO;

    @Column(name = "pending_qty", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal pendingQty = BigDecimal.ZERO;

    @Column(name = "rate", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal rate = BigDecimal.ZERO;

    @Column(name = "discount_amount", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "tax_amount", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal taxAmount = BigDecimal.ZERO;
}

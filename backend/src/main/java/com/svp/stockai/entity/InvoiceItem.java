package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "invoice_item", uniqueConstraints = {
    @UniqueConstraint(name = "uq_invoice_dispatch_item", columnNames = {"invoice_id", "dispatch_item_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "invoice_item_id", nullable = false)
    private Long invoiceItemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dispatch_item_id", nullable = false)
    private DispatchItem dispatchItem;

    @Column(name = "quantity", nullable = false, precision = 18, scale = 4)
    private BigDecimal quantity;

    @Column(name = "rate", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal rate = BigDecimal.ZERO;
}

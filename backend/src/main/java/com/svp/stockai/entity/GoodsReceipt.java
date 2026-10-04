package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "goods_receipt", uniqueConstraints = {
    @UniqueConstraint(name = "goods_receipt_gr_number_key", columnNames = {"gr_number"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GoodsReceipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "gr_id", nullable = false)
    private Long grId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "po_id", nullable = false)
    private PurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @Column(name = "gr_number", nullable = false, length = 50, unique = true)
    private String grNumber;

    @Column(name = "gr_date", nullable = false)
    @Builder.Default
    private LocalDate grDate = LocalDate.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "received_by")
    private AppUser receivedBy;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "Open"; // 'Open','Closed'
}

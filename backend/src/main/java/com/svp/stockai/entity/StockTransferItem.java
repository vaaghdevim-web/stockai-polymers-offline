package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "stock_transfer_item")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockTransferItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "sti_id", nullable = false)
    private Long stiId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transfer_id", nullable = false)
    private StockTransfer transfer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_batch_id")
    private MaterialBatch materialBatch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "finished_batch_id")
    private FinishedBatch finishedBatch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_bin_id", nullable = false)
    private LocationBin fromBin;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_bin_id", nullable = false)
    private LocationBin toBin;

    @Column(name = "quantity", nullable = false, precision = 18, scale = 4)
    private BigDecimal quantity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uom_id", nullable = false)
    private UnitOfMeasure uom;
}

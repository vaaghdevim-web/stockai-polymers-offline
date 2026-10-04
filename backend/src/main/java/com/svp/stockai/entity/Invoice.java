package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "invoice", uniqueConstraints = {
    @UniqueConstraint(name = "invoice_invoice_number_key", columnNames = {"invoice_number"}),
    @UniqueConstraint(name = "invoice_dispatch_id_key", columnNames = {"dispatch_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "invoice_id", nullable = false)
    private Long invoiceId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dispatch_id", nullable = false, unique = true)
    private Dispatch dispatch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "customer_name_snapshot", length = 150)
    private String customerNameSnapshot;

    @Column(name = "customer_gst_snapshot", length = 30)
    private String customerGstSnapshot;

    @Column(name = "billing_address_snapshot", columnDefinition = "jsonb")
    private String billingAddressSnapshot;

    @Column(name = "invoice_number", nullable = false, length = 50, unique = true)
    private String invoiceNumber;

    @Column(name = "invoice_date", nullable = false)
    @Builder.Default
    private LocalDate invoiceDate = LocalDate.now();

    @Column(name = "subtotal", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "discount_amount", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "taxable_amount", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal taxableAmount = BigDecimal.ZERO;

    @Column(name = "tax_amount", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "grand_total", nullable = false, precision = 18, scale = 4)
    @Builder.Default
    private BigDecimal grandTotal = BigDecimal.ZERO;

    @Column(name = "payment_status", length = 30)
    private String paymentStatus;

    @Column(name = "due_date")
    private LocalDate dueDate;
}

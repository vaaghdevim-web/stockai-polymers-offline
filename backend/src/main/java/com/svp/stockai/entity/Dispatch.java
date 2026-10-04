package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "dispatch", uniqueConstraints = {
    @UniqueConstraint(name = "dispatch_dispatch_number_key", columnNames = {"dispatch_number"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Dispatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "dispatch_id", nullable = false)
    private Long dispatchId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private CustomerOrder order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id")
    private Driver driver;

    @Column(name = "dispatch_number", nullable = false, length = 50, unique = true)
    private String dispatchNumber;

    @Column(name = "dispatch_date", nullable = false)
    @Builder.Default
    private LocalDate dispatchDate = LocalDate.now();

    @Column(name = "expected_delivery_date")
    private LocalDate expectedDeliveryDate;

    @Column(name = "actual_delivery_date")
    private LocalDate actualDeliveryDate;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "Prepared"; // 'Prepared','Dispatched','Delivered','Cancelled'

    @Column(name = "carrier", length = 150)
    private String carrier;

    @Column(name = "shipping_method", length = 100)
    private String shippingMethod;

    @Column(name = "tracking_number", length = 150)
    private String trackingNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private AppUser createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}

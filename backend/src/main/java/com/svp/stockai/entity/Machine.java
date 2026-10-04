package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "machine", uniqueConstraints = {
    @UniqueConstraint(name = "machine_machine_code_key", columnNames = {"machine_code"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Machine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "machine_id", nullable = false)
    private Long machineId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_id", nullable = false)
    private ProductionUnit unit;

    @Column(name = "machine_code", nullable = false, length = 50, unique = true)
    private String machineCode;

    @Column(name = "machine_name", nullable = false, length = 150)
    private String machineName;

    @Column(name = "machine_type", length = 100)
    private String machineType;

    @Column(name = "rated_capacity", precision = 18, scale = 4)
    private BigDecimal ratedCapacity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "capacity_uom_id")
    private UnitOfMeasure capacityUom;

    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private String status = "Available"; // 'Available','Running','Maintenance','Stopped','Fault','Retired'

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}

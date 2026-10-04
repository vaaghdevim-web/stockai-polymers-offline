package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "driver", uniqueConstraints = {
    @UniqueConstraint(name = "driver_license_number_key", columnNames = {"license_number"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Driver {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "driver_id", nullable = false)
    private Long driverId;

    @Column(name = "driver_name", nullable = false, length = 150)
    private String driverName;

    @Column(name = "license_number", nullable = false, length = 80, unique = true)
    private String licenseNumber;

    @Column(name = "license_expiry")
    private LocalDate licenseExpiry;

    @Column(name = "phone", length = 30)
    private String phone;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}

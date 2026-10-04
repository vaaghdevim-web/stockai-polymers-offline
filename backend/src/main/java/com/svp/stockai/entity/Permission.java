package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "permission", uniqueConstraints = {
    @UniqueConstraint(name = "uq_permission_module_name", columnNames = {"module_name", "permission_name"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Permission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "permission_id", nullable = false)
    private Long permissionId;

    @Column(name = "module_name", nullable = false, length = 100)
    private String moduleName;

    @Column(name = "permission_name", nullable = false, length = 100)
    private String permissionName;
}

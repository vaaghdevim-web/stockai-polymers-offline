package com.svp.stockai.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "material_category", uniqueConstraints = {
    @UniqueConstraint(name = "uq_material_category_name", columnNames = {"category_name"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaterialCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "category_id", nullable = false)
    private Long categoryId;

    @Column(name = "category_name", nullable = false, length = 100)
    private String categoryName;

    @Column(name = "category_type", nullable = false, length = 30)
    private String categoryType; // 'Raw', 'Additive', 'Packaging', 'Other'

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}

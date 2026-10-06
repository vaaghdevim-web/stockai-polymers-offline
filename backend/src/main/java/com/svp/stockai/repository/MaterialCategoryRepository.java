package com.svp.stockai.repository;

import com.svp.stockai.entity.MaterialCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MaterialCategoryRepository extends JpaRepository<MaterialCategory, Long> {
    Optional<MaterialCategory> findByCategoryName(String categoryName);
}

package com.svp.stockai.repository;

import com.svp.stockai.entity.ProductCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductCategoryRepository extends JpaRepository<ProductCategory, Long> {
    Optional<ProductCategory> findByCategoryNameIgnoreCase(String categoryName);
    List<ProductCategory> findByIsActiveTrue();
}

package com.svp.stockai.repository;

import com.svp.stockai.entity.FinishedProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FinishedProductRepository extends JpaRepository<FinishedProduct, Long> {

    Optional<FinishedProduct> findByProductCode(String productCode);

    List<FinishedProduct> findByIsActiveTrue();
}

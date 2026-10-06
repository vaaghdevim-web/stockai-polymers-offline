package com.svp.stockai.repository;

import com.svp.stockai.entity.FinishedProduct;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FinishedProductRepository extends JpaRepository<FinishedProduct, Long> {

    @EntityGraph(attributePaths = {"category", "defaultUom"})
    List<FinishedProduct> findAll();

    @EntityGraph(attributePaths = {"category", "defaultUom"})
    Optional<FinishedProduct> findById(Long id);

    @EntityGraph(attributePaths = {"category", "defaultUom"})
    Optional<FinishedProduct> findByProductCode(String productCode);

    @EntityGraph(attributePaths = {"category", "defaultUom"})
    List<FinishedProduct> findByIsActiveTrue();
}

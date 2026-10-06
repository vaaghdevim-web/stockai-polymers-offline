package com.svp.stockai.repository;

import com.svp.stockai.entity.Bom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BomRepository extends JpaRepository<Bom, Long> {
    List<Bom> findByStatus(String status);
    Optional<Bom> findFirstByStatus(String status);
    List<Bom> findByProduct_ProductId(Long productId);
}

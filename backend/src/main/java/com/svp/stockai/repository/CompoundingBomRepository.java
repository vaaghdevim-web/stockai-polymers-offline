package com.svp.stockai.repository;

import com.svp.stockai.entity.CompoundingBom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompoundingBomRepository extends JpaRepository<CompoundingBom, Long> {

    Optional<CompoundingBom> findByBomCodeAndVersion(String bomCode, String version);

    List<CompoundingBom> findByStatus(String status);
}

package com.svp.stockai.repository;

import com.svp.stockai.entity.CompoundingBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompoundingBatchRepository extends JpaRepository<CompoundingBatch, Long> {

    Optional<CompoundingBatch> findByBatchCode(String batchCode);

    List<CompoundingBatch> findByStatus(String status);
}

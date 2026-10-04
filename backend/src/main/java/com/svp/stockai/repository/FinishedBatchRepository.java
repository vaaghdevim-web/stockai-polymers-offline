package com.svp.stockai.repository;

import com.svp.stockai.entity.FinishedBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FinishedBatchRepository extends JpaRepository<FinishedBatch, Long> {

    Optional<FinishedBatch> findByBatchNo(String batchNo);

    List<FinishedBatch> findByProduct_ProductId(Long productId);

    List<FinishedBatch> findByQualityStatus(String qualityStatus);
}

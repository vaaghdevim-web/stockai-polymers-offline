package com.svp.stockai.repository;

import com.svp.stockai.entity.ProductionOutput;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductionOutputRepository
        extends JpaRepository<ProductionOutput, Long> {

    List<ProductionOutput> findByProductionRun_ProductionId(Long productionId);

    Optional<ProductionOutput> findByFinishedBatch_FinishedBatchId(
            Long finishedBatchId
    );
}
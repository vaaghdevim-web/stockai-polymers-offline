package com.svp.stockai.repository;

import com.svp.stockai.entity.BatchGenealogy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BatchGenealogyRepository extends JpaRepository<BatchGenealogy, Long> {

    List<BatchGenealogy> findByFinishedBatch_FinishedBatchId(Long finishedBatchId);

    List<BatchGenealogy> findByFinishedBatch_BatchNo(String batchNo);

    List<BatchGenealogy> findByRawMaterialBatch_BatchId(Long rawMaterialBatchId);

    List<BatchGenealogy> findByRawMaterialBatch_BatchNo(String batchNo);

    List<BatchGenealogy> findByRawMaterialBatch_LotNumber(String lotNumber);

    List<BatchGenealogy> findByCompoundingBatch_CompoundingBatchId(Long compoundingBatchId);

    List<BatchGenealogy> findByProductionRun_ProductionId(Long productionId);
}

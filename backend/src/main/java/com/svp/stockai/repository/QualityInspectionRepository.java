package com.svp.stockai.repository;

import com.svp.stockai.entity.QualityInspection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QualityInspectionRepository extends JpaRepository<QualityInspection, Long> {

    List<QualityInspection> findByMaterialBatch_BatchId(Long batchId);

    List<QualityInspection> findByProductionRun_ProductionId(Long productionId);

    List<QualityInspection> findByFinishedBatch_FinishedBatchId(Long finishedBatchId);

    List<QualityInspection> findByStatus(String status);

    List<QualityInspection> findByInspectionType(String inspectionType);
}

package com.svp.stockai.repository;

import com.svp.stockai.entity.ProductionStage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductionStageRepository extends JpaRepository<ProductionStage, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT ps FROM ProductionStage ps WHERE ps.stageId = :stageId AND ps.productionRun.productionId = :productionId")
    java.util.Optional<ProductionStage> findByIdAndProductionIdWithLock(@Param("stageId") Long stageId,
                                                                         @Param("productionId") Long productionId);

    List<ProductionStage> findByProductionRun_ProductionIdOrderBySequenceNoAsc(Long productionId);

    List<ProductionStage> findByStatus(String status);
}

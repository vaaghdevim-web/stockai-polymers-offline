package com.svp.stockai.repository;

import com.svp.stockai.entity.MaterialBatch;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MaterialBatchRepository extends JpaRepository<MaterialBatch, Long> {

    Optional<MaterialBatch> findByBatchNo(String batchNo);

    Optional<MaterialBatch> findByLotNumber(String lotNumber);

    List<MaterialBatch> findBySupplier_SupplierId(Long supplierId);

    /**
     * FIFO Lot Allocation Query:
     * Retrieves active, available material batches ordered by received_at ASC.
     */
    @Query("SELECT mb FROM MaterialBatch mb WHERE mb.material.materialId = :materialId " +
           "AND mb.qualityStatus = 'Available' AND mb.status = 'Available' AND mb.currentWeightKg > 0 " +
           "ORDER BY mb.receivedAt ASC, mb.batchId ASC")
    List<MaterialBatch> findAvailableBatchesFIFO(@Param("materialId") Long materialId);

    /**
     * Pessimistic Lock to protect against concurrency race conditions
     * during extrusion line and compounding batch draws.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT mb FROM MaterialBatch mb WHERE mb.batchId = :batchId")
    Optional<MaterialBatch> findByIdWithLock(@Param("batchId") Long batchId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT mb FROM MaterialBatch mb WHERE mb.lotNumber = :lotNumber")
    Optional<MaterialBatch> findByLotNumberWithLock(@Param("lotNumber") String lotNumber);
}

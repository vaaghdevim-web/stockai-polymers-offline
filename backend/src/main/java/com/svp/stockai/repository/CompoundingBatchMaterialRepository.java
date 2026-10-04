package com.svp.stockai.repository;

import com.svp.stockai.entity.CompoundingBatchMaterial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CompoundingBatchMaterialRepository extends JpaRepository<CompoundingBatchMaterial, Long> {

    List<CompoundingBatchMaterial> findByCompoundingBatch_CompoundingBatchId(Long compoundingBatchId);

    List<CompoundingBatchMaterial> findByMaterialBatch_BatchId(Long materialBatchId);
}

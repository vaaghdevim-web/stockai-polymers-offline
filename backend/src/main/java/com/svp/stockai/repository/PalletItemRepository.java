package com.svp.stockai.repository;

import com.svp.stockai.entity.PalletItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PalletItemRepository
        extends JpaRepository<PalletItem, Long> {

    List<PalletItem> findByPallet_PalletId(Long palletId);

    List<PalletItem> findByFinishedBatch_FinishedBatchId(
            Long finishedBatchId
    );
}
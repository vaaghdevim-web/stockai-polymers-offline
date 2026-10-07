package com.svp.stockai.repository;

import com.svp.stockai.entity.LocationBin;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LocationBinRepository extends JpaRepository<LocationBin, Long> {

    Optional<LocationBin> findByShelf_ShelfIdAndBinCode(Long shelfId, String binCode);

    List<LocationBin> findByShelf_ShelfId(Long shelfId);

    List<LocationBin> findByShelf_Rack_Warehouse_WarehouseId(Long warehouseId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM LocationBin b WHERE b.binId = :binId")
    Optional<LocationBin> findByIdWithLock(@Param("binId") Long binId);
}

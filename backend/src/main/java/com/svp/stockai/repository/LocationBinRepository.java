package com.svp.stockai.repository;

import com.svp.stockai.entity.LocationBin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LocationBinRepository extends JpaRepository<LocationBin, Long> {

    Optional<LocationBin> findByShelf_ShelfIdAndBinCode(Long shelfId, String binCode);

    List<LocationBin> findByShelf_ShelfId(Long shelfId);

    List<LocationBin> findByShelf_Rack_Warehouse_WarehouseId(Long warehouseId);
}

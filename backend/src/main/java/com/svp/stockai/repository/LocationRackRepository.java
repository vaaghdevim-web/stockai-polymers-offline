package com.svp.stockai.repository;

import com.svp.stockai.entity.LocationRack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LocationRackRepository extends JpaRepository<LocationRack, Long> {
    List<LocationRack> findByWarehouse_WarehouseId(Long warehouseId);
    Optional<LocationRack> findByWarehouse_WarehouseIdAndRackCode(Long warehouseId, String rackCode);
}

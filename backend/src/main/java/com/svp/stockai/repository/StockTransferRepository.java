package com.svp.stockai.repository;

import com.svp.stockai.entity.StockTransfer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockTransferRepository extends JpaRepository<StockTransfer, Long> {

    Optional<StockTransfer> findByTransferNumber(String transferNumber);

    List<StockTransfer> findByStatus(String status);

    List<StockTransfer> findByFromWarehouse_WarehouseId(Long warehouseId);

    List<StockTransfer> findByToWarehouse_WarehouseId(Long warehouseId);
}

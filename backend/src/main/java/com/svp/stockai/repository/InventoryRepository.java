package com.svp.stockai.repository;

import com.svp.stockai.entity.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    Optional<Inventory> findByMaterialBatch_BatchIdAndBin_BinId(Long batchId, Long binId);

    Optional<Inventory> findByFinishedBatch_FinishedBatchIdAndBin_BinId(Long finishedBatchId, Long binId);

    List<Inventory> findByMaterialBatch_Material_MaterialId(Long materialId);

    List<Inventory> findByFinishedBatch_Product_ProductId(Long productId);

    @Query("SELECT COALESCE(SUM(i.quantityOnHand - i.reservedQty), 0) FROM Inventory i " +
           "WHERE i.materialBatch.material.materialId = :materialId")
    BigDecimal getTotalAvailableRawMaterial(@Param("materialId") Long materialId);

    @Query("SELECT COALESCE(SUM(i.quantityOnHand - i.reservedQty), 0) FROM Inventory i " +
           "WHERE i.finishedBatch.product.productId = :productId")
    BigDecimal getTotalAvailableFinishedProduct(@Param("productId") Long productId);
}

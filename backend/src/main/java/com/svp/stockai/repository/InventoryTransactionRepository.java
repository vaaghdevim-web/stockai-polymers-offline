package com.svp.stockai.repository;

import com.svp.stockai.entity.InventoryTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, Long> {

    List<InventoryTransaction> findByInventory_InventoryIdOrderByTransactionDateDesc(Long inventoryId);

    List<InventoryTransaction> findByReferenceTypeAndReferenceId(String referenceType, String referenceId);
}

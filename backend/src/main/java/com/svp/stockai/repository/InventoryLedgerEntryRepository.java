package com.svp.stockai.repository;

import com.svp.stockai.entity.InventoryLedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface InventoryLedgerEntryRepository extends JpaRepository<InventoryLedgerEntry, Long> {

    List<InventoryLedgerEntry> findByLedgerTransaction_LedgerTransactionId(Long ledgerTransactionId);

    @Query("SELECT COALESCE(SUM(CASE WHEN e.entryType = 'DEBIT' THEN e.quantity ELSE -e.quantity END), 0) " +
           "FROM InventoryLedgerEntry e WHERE e.inventory.inventoryId = :inventoryId")
    BigDecimal getNetLedgerBalance(@Param("inventoryId") Long inventoryId);
}

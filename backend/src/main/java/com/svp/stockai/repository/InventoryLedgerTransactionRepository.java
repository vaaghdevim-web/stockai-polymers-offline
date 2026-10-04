package com.svp.stockai.repository;

import com.svp.stockai.entity.InventoryLedgerTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface InventoryLedgerTransactionRepository extends JpaRepository<InventoryLedgerTransaction, Long> {

    Optional<InventoryLedgerTransaction> findByTransactionGroupId(UUID transactionGroupId);
}

package com.svp.stockai.repository;

import com.svp.stockai.entity.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {

    List<PurchaseOrder> findAllByOrderByPoDateDescPoIdDesc();

    List<PurchaseOrder> findByStatusOrderByPoDateDesc(String status);

    Optional<PurchaseOrder> findByPoNumber(String poNumber);

    List<PurchaseOrder> findBySupplier_SupplierIdOrderByPoDateDesc(Long supplierId);
}

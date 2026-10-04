package com.svp.stockai.repository;

import com.svp.stockai.entity.OrderAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderAllocationRepository extends JpaRepository<OrderAllocation, Long> {
    List<OrderAllocation> findByOrderItem_Order_OrderId(Long orderId);
    List<OrderAllocation> findByFinishedBatch_FinishedBatchId(Long finishedBatchId);
}

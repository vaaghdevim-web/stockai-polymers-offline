package com.svp.stockai.repository;

import com.svp.stockai.entity.Dispatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DispatchRepository extends JpaRepository<Dispatch, Long> {
    Optional<Dispatch> findByDispatchNumber(String dispatchNumber);
    List<Dispatch> findByStatus(String status);
    List<Dispatch> findByOrder_OrderId(Long orderId);
}

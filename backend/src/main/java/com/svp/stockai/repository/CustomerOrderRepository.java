package com.svp.stockai.repository;

import com.svp.stockai.entity.CustomerOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerOrderRepository extends JpaRepository<CustomerOrder, Long> {
    Optional<CustomerOrder> findByOrderNumber(String orderNumber);
    List<CustomerOrder> findByStatus(String status);
    List<CustomerOrder> findByCustomer_CustomerId(Long customerId);
}

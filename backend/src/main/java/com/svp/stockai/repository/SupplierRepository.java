package com.svp.stockai.repository;

import com.svp.stockai.entity.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long> {

    Optional<Supplier> findByGstNo(String gstNo);

    List<Supplier> findByIsActiveTrue();
}

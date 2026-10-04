package com.svp.stockai.repository;

import com.svp.stockai.entity.QcSpecification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QcSpecificationRepository extends JpaRepository<QcSpecification, Long> {

    List<QcSpecification> findByProduct_ProductIdAndIsActiveTrue(Long productId);

    List<QcSpecification> findByInspectionTypeAndIsActiveTrue(String inspectionType);

    List<QcSpecification> findByIsActiveTrue();
}

package com.svp.stockai.repository;

import com.svp.stockai.entity.QualityInspectionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QualityInspectionItemRepository extends JpaRepository<QualityInspectionItem, Long> {

    List<QualityInspectionItem> findByInspection_InspectionId(Long inspectionId);
}

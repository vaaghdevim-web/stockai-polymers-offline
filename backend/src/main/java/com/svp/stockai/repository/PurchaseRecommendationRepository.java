package com.svp.stockai.repository;

import com.svp.stockai.entity.PurchaseRecommendation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PurchaseRecommendationRepository extends JpaRepository<PurchaseRecommendation, Long> {

    List<PurchaseRecommendation> findByStatus(String status);

    List<PurchaseRecommendation> findByPriority(String priority);

    List<PurchaseRecommendation> findByMaterial_MaterialIdAndStatusIn(Long materialId, List<String> statuses);

    List<PurchaseRecommendation> findByPlant_PlantId(Long plantId);
}

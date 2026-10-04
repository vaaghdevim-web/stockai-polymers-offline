package com.svp.stockai.repository;

import com.svp.stockai.entity.ProductionRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductionRunRepository extends JpaRepository<ProductionRun, Long> {

    Optional<ProductionRun> findByProductionNumber(String productionNumber);

    List<ProductionRun> findByPlant_PlantIdAndStatus(Long plantId, String status);

    List<ProductionRun> findByStatus(String status);

    @org.springframework.data.jpa.repository.Query("SELECT pr FROM ProductionRun pr WHERE pr.status NOT IN ('Completed', 'Cancelled') ORDER BY pr.createdAt DESC")
    List<ProductionRun> findWipRuns();

    @org.springframework.data.jpa.repository.Query("SELECT pr FROM ProductionRun pr WHERE pr.plant.plantId = :plantId AND pr.status NOT IN ('Completed', 'Cancelled') ORDER BY pr.createdAt DESC")
    List<ProductionRun> findWipRunsByPlantId(@org.springframework.data.repository.query.Param("plantId") Long plantId);
}

package com.svp.stockai.repository;

import com.svp.stockai.entity.ProductionUnit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductionUnitRepository extends JpaRepository<ProductionUnit, Long> {
    List<ProductionUnit> findByPlant_PlantIdOrderBySequenceNoAsc(Long plantId);
    List<ProductionUnit> findByOrderBySequenceNoAsc();
    Optional<ProductionUnit> findByUnitType(String unitType);
    Optional<ProductionUnit> findByUnitCode(String unitCode);
}

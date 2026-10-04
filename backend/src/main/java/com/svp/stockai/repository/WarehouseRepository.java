package com.svp.stockai.repository;

import com.svp.stockai.entity.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WarehouseRepository extends JpaRepository<Warehouse, Long> {

    List<Warehouse> findByPlant_PlantId(Long plantId);

    List<Warehouse> findByTypeAndIsActiveTrue(String type);
}

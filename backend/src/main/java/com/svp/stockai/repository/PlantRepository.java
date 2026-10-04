package com.svp.stockai.repository;

import com.svp.stockai.entity.Plant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlantRepository extends JpaRepository<Plant, Long> {

    Optional<Plant> findByPlantName(String plantName);

    List<Plant> findByIsActiveTrue();
}

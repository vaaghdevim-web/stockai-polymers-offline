package com.svp.stockai.repository;

import com.svp.stockai.entity.RawMaterial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RawMaterialRepository extends JpaRepository<RawMaterial, Long> {

    Optional<RawMaterial> findByMaterialCode(String materialCode);

    List<RawMaterial> findByIsActiveTrue();

    List<RawMaterial> findByCategory_CategoryId(Long categoryId);

    @Query("SELECT rm FROM RawMaterial rm WHERE rm.isActive = true AND rm.reorderLevel > 0")
    List<RawMaterial> findAllWithReorderLevel();
}

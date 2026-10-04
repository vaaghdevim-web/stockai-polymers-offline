package com.svp.stockai.repository;

import com.svp.stockai.entity.CompoundingBomItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CompoundingBomItemRepository extends JpaRepository<CompoundingBomItem, Long> {

    List<CompoundingBomItem> findByCompoundingBom_CompoundingBomId(Long compoundingBomId);
}

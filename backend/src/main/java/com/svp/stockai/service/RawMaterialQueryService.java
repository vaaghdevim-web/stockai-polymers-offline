package com.svp.stockai.service;

import com.svp.stockai.dto.RawMaterialResponse;
import com.svp.stockai.entity.RawMaterial;
import com.svp.stockai.repository.RawMaterialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RawMaterialQueryService {

    private final RawMaterialRepository rawMaterialRepository;
    private final com.svp.stockai.repository.InventoryRepository inventoryRepository;

    @Transactional(readOnly = true)
    public List<RawMaterialResponse> findAll() {
        return rawMaterialRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public RawMaterialResponse findById(Long materialId) {
        return rawMaterialRepository.findById(materialId)
                .map(this::toResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Raw material " + materialId + " was not found"));
    }

    @Transactional(readOnly = true)
    public java.math.BigDecimal getAvailableStock(Long materialId) {
        return inventoryRepository.getTotalAvailableRawMaterial(materialId);
    }

    private RawMaterialResponse toResponse(RawMaterial material) {
        return new RawMaterialResponse(
                material.getMaterialId(),
                material.getMaterialName(),
                material.getMaterialCode(),
                material.getCategory().getCategoryId(),
                material.getCategory().getCategoryName(),
                material.getDefaultUom().getUomId(),
                material.getDefaultUom().getUomCode(),
                material.getStandardCost(),
                material.getReorderLevel(),
                material.getSafetyStock(),
                material.getLeadTimeDays(),
                material.getIsActive());
    }
}

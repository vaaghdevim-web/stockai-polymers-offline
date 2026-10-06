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
    private final com.svp.stockai.repository.MaterialCategoryRepository materialCategoryRepository;
    private final com.svp.stockai.repository.UnitOfMeasureRepository unitOfMeasureRepository;

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

    @Transactional(readOnly = true)
    public List<com.svp.stockai.entity.MaterialCategory> getCategories() {
        return materialCategoryRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<com.svp.stockai.entity.UnitOfMeasure> getUoms() {
        return unitOfMeasureRepository.findAll();
    }

    @Transactional
    public RawMaterialResponse createRawMaterial(com.svp.stockai.dto.CreateRawMaterialRequest request) {
        if (request == null || request.getMaterialName() == null || request.getMaterialName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Material name is required");
        }

        com.svp.stockai.entity.MaterialCategory category = null;
        if (request.getCategoryId() != null) {
            category = materialCategoryRepository.findById(request.getCategoryId()).orElse(null);
        }
        if (category == null) {
            category = materialCategoryRepository.findAll().stream().findFirst()
                    .orElseGet(() -> materialCategoryRepository.save(
                            com.svp.stockai.entity.MaterialCategory.builder()
                                    .categoryName("General Polymers")
                                    .categoryType("Raw")
                                    .isActive(true)
                                    .build()
                    ));
        }

        com.svp.stockai.entity.UnitOfMeasure uom = null;
        if (request.getDefaultUomId() != null) {
            uom = unitOfMeasureRepository.findById(request.getDefaultUomId()).orElse(null);
        }
        if (uom == null) {
            uom = unitOfMeasureRepository.findByUomCode("KG")
                    .or(() -> unitOfMeasureRepository.findAll().stream().findFirst())
                    .orElseGet(() -> unitOfMeasureRepository.save(
                            com.svp.stockai.entity.UnitOfMeasure.builder()
                                    .uomCode("KG")
                                    .uomType("Weight")
                                    .build()
                    ));
        }

        String materialCode = request.getMaterialCode();
        if (materialCode == null || materialCode.isBlank()) {
            String sanitized = request.getMaterialName().trim().toUpperCase().replaceAll("[^A-Z0-9]+", "-");
            materialCode = "RM-" + sanitized;
        }

        // Check code uniqueness
        if (rawMaterialRepository.findByMaterialCode(materialCode).isPresent()) {
            materialCode = materialCode + "-" + System.currentTimeMillis() % 10000;
        }

        RawMaterial material = RawMaterial.builder()
                .materialName(request.getMaterialName().trim())
                .materialCode(materialCode)
                .category(category)
                .defaultUom(uom)
                .standardCost(request.getStandardCost() != null ? request.getStandardCost() : java.math.BigDecimal.ZERO)
                .reorderLevel(request.getReorderLevel() != null ? request.getReorderLevel() : new java.math.BigDecimal("5000"))
                .safetyStock(request.getSafetyStock() != null ? request.getSafetyStock() : new java.math.BigDecimal("2000"))
                .leadTimeDays(request.getLeadTimeDays() != null ? request.getLeadTimeDays() : 7)
                .isActive(true)
                .build();

        RawMaterial saved = rawMaterialRepository.save(material);
        return toResponse(saved);
    }

    @Transactional
    public void deleteMaterial(Long materialId) {
        RawMaterial rm = rawMaterialRepository.findById(materialId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Raw Material not found with ID: " + materialId));
        rm.setIsActive(false);
        rawMaterialRepository.save(rm);
    }

    private RawMaterialResponse toResponse(RawMaterial material) {
        return new RawMaterialResponse(
                material.getMaterialId(),
                material.getMaterialName(),
                material.getMaterialCode(),
                material.getCategory() != null ? material.getCategory().getCategoryId() : null,
                material.getCategory() != null ? material.getCategory().getCategoryName() : "General",
                material.getDefaultUom() != null ? material.getDefaultUom().getUomId() : null,
                material.getDefaultUom() != null ? material.getDefaultUom().getUomCode() : "KG",
                material.getStandardCost(),
                material.getReorderLevel(),
                material.getSafetyStock(),
                material.getLeadTimeDays(),
                material.getIsActive());
    }
}

package com.svp.stockai.service;

import com.svp.stockai.dto.*;
import com.svp.stockai.entity.AppUser;
import com.svp.stockai.entity.CompoundingBom;
import com.svp.stockai.entity.CompoundingBomItem;
import com.svp.stockai.entity.RawMaterial;
import com.svp.stockai.repository.AppUserRepository;
import com.svp.stockai.repository.CompoundingBomItemRepository;
import com.svp.stockai.repository.CompoundingBomRepository;
import com.svp.stockai.repository.RawMaterialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CompoundingBomService {

    private static final BigDecimal HUNDRED = new BigDecimal("100.0000");
    private static final BigDecimal TOLERANCE = new BigDecimal("0.0001");

    private final CompoundingBomRepository compoundingBomRepository;
    private final CompoundingBomItemRepository compoundingBomItemRepository;
    private final RawMaterialRepository rawMaterialRepository;
    private final AppUserRepository appUserRepository;

    @Transactional
    public CompoundingBomResponse createBom(CompoundingBomRequest request, String currentUsername) {
        // 1. Uniqueness check for (bomCode, version)
        if (compoundingBomRepository.findByBomCodeAndVersion(request.getBomCode(), request.getVersion()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Compounding BOM with code '" + request.getBomCode() + "' and version '" + request.getVersion() + "' already exists");
        }

        // 2. Date consistency check
        if (request.getEffectiveFrom() != null && request.getEffectiveTo() != null) {
            if (request.getEffectiveTo().isBefore(request.getEffectiveFrom())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "effectiveTo cannot be before effectiveFrom");
            }
        }

        // 3. Formula Percentage Total Invariant (Must equal 100%)
        BigDecimal totalPercentage = BigDecimal.ZERO;
        for (CompoundingBomItemRequest itemReq : request.getItems()) {
            totalPercentage = totalPercentage.add(itemReq.getPercentage());
        }

        if (totalPercentage.subtract(HUNDRED).abs().compareTo(TOLERANCE) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Total recipe percentage must equal 100.0000%. Current sum: " + totalPercentage + "%");
        }

        // 4. Resolve Creator (if present)
        AppUser creator = null;
        if (currentUsername != null) {
            creator = appUserRepository.findByUserName(currentUsername).orElse(null);
        }

        // 5. Persist Compounding BOM Header
        CompoundingBom bom = CompoundingBom.builder()
                .bomCode(request.getBomCode())
                .version(request.getVersion())
                .effectiveFrom(request.getEffectiveFrom())
                .effectiveTo(request.getEffectiveTo())
                .targetBatchWeightKg(request.getTargetBatchWeightKg())
                .status("Draft")
                .createdBy(creator)
                .build();

        CompoundingBom savedBom = compoundingBomRepository.save(bom);

        // 6. Persist Recipe Items with target weight calculations
        List<CompoundingBomItem> savedItems = new ArrayList<>();
        for (CompoundingBomItemRequest itemReq : request.getItems()) {
            RawMaterial material = rawMaterialRepository.findById(itemReq.getMaterialId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Raw material not found with ID: " + itemReq.getMaterialId()));

            BigDecimal targetKg = request.getTargetBatchWeightKg()
                    .multiply(itemReq.getPercentage())
                    .divide(HUNDRED, 4, RoundingMode.HALF_UP);

            CompoundingBomItem item = CompoundingBomItem.builder()
                    .compoundingBom(savedBom)
                    .material(material)
                    .percentage(itemReq.getPercentage())
                    .targetQuantityKg(targetKg)
                    .isRequired(itemReq.getIsRequired() != null ? itemReq.getIsRequired() : true)
                    .build();

            savedItems.add(compoundingBomItemRepository.save(item));
        }

        return mapToResponse(savedBom, savedItems);
    }

    @Transactional
    public CompoundingBomResponse activateBom(Long bomId) {
        CompoundingBom bom = compoundingBomRepository.findById(bomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Compounding BOM not found with ID: " + bomId));

        if ("Active".equalsIgnoreCase(bom.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Compounding BOM is already Active");
        }

        List<CompoundingBomItem> items = compoundingBomItemRepository.findByCompoundingBom_CompoundingBomId(bomId);
        if (items.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot activate a Compounding BOM with no recipe items");
        }

        bom.setStatus("Active");
        CompoundingBom updatedBom = compoundingBomRepository.save(bom);
        return mapToResponse(updatedBom, items);
    }

    @Transactional
    public CompoundingBomResponse retireBom(Long bomId) {
        CompoundingBom bom = compoundingBomRepository.findById(bomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Compounding BOM not found with ID: " + bomId));

        bom.setStatus("Retired");
        CompoundingBom updatedBom = compoundingBomRepository.save(bom);
        List<CompoundingBomItem> items = compoundingBomItemRepository.findByCompoundingBom_CompoundingBomId(bomId);
        return mapToResponse(updatedBom, items);
    }

    @Transactional(readOnly = true)
    public CompoundingBomResponse getBomById(Long bomId) {
        CompoundingBom bom = compoundingBomRepository.findById(bomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Compounding BOM not found with ID: " + bomId));
        List<CompoundingBomItem> items = compoundingBomItemRepository.findByCompoundingBom_CompoundingBomId(bomId);
        return mapToResponse(bom, items);
    }

    @Transactional(readOnly = true)
    public List<CompoundingBomResponse> getAllBoms(String status) {
        List<CompoundingBom> boms = (status != null && !status.isBlank())
                ? compoundingBomRepository.findByStatus(status)
                : compoundingBomRepository.findAll();

        return boms.stream().map(bom -> {
            List<CompoundingBomItem> items = compoundingBomItemRepository.findByCompoundingBom_CompoundingBomId(bom.getCompoundingBomId());
            return mapToResponse(bom, items);
        }).toList();
    }

    @Transactional(readOnly = true)
    public BatchRequirementCalculationResponse calculateBatchRequirements(Long bomId, BigDecimal desiredBatchWeightKg) {
        if (desiredBatchWeightKg == null || desiredBatchWeightKg.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "desiredBatchWeightKg must be greater than 0");
        }

        CompoundingBom bom = compoundingBomRepository.findById(bomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Compounding BOM not found with ID: " + bomId));

        List<CompoundingBomItem> items = compoundingBomItemRepository.findByCompoundingBom_CompoundingBomId(bomId);

        List<BatchRequirementCalculationResponse.CalculatedItemRequirement> calculatedList = items.stream().map(item -> {
            BigDecimal reqKg = desiredBatchWeightKg
                    .multiply(item.getPercentage())
                    .divide(HUNDRED, 4, RoundingMode.HALF_UP);

            return BatchRequirementCalculationResponse.CalculatedItemRequirement.builder()
                    .materialId(item.getMaterial().getMaterialId())
                    .materialCode(item.getMaterial().getMaterialCode())
                    .materialName(item.getMaterial().getMaterialName())
                    .categoryName(item.getMaterial().getCategory() != null ? item.getMaterial().getCategory().getCategoryName() : null)
                    .percentage(item.getPercentage())
                    .requiredQuantityKg(reqKg)
                    .isRequired(item.getIsRequired())
                    .build();
        }).toList();

        return BatchRequirementCalculationResponse.builder()
                .compoundingBomId(bom.getCompoundingBomId())
                .bomCode(bom.getBomCode())
                .version(bom.getVersion())
                .desiredBatchWeightKg(desiredBatchWeightKg)
                .calculatedRequirements(calculatedList)
                .build();
    }

    private CompoundingBomResponse mapToResponse(CompoundingBom bom, List<CompoundingBomItem> items) {
        List<CompoundingBomItemResponse> itemResponses = items.stream().map(item ->
                CompoundingBomItemResponse.builder()
                        .compoundingBomItemId(item.getCompoundingBomItemId())
                        .materialId(item.getMaterial().getMaterialId())
                        .materialCode(item.getMaterial().getMaterialCode())
                        .materialName(item.getMaterial().getMaterialName())
                        .categoryName(item.getMaterial().getCategory() != null ? item.getMaterial().getCategory().getCategoryName() : null)
                        .percentage(item.getPercentage())
                        .targetQuantityKg(item.getTargetQuantityKg())
                        .isRequired(item.getIsRequired())
                        .build()
        ).toList();

        return CompoundingBomResponse.builder()
                .compoundingBomId(bom.getCompoundingBomId())
                .bomCode(bom.getBomCode())
                .version(bom.getVersion())
                .effectiveFrom(bom.getEffectiveFrom())
                .effectiveTo(bom.getEffectiveTo())
                .targetBatchWeightKg(bom.getTargetBatchWeightKg())
                .status(bom.getStatus())
                .createdByUserName(bom.getCreatedBy() != null ? bom.getCreatedBy().getUserName() : null)
                .createdAt(bom.getCreatedAt())
                .updatedAt(bom.getUpdatedAt())
                .items(itemResponses)
                .build();
    }
}

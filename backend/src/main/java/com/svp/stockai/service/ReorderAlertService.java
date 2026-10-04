package com.svp.stockai.service;

import com.svp.stockai.dto.*;
import com.svp.stockai.entity.AppUser;
import com.svp.stockai.entity.Plant;
import com.svp.stockai.entity.PurchaseRecommendation;
import com.svp.stockai.entity.RawMaterial;
import com.svp.stockai.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReorderAlertService {

    private final RawMaterialRepository rawMaterialRepository;
    private final InventoryRepository inventoryRepository;
    private final PurchaseRecommendationRepository purchaseRecommendationRepository;
    private final PlantRepository plantRepository;
    private final AppUserRepository appUserRepository;

    @Autowired(required = false)
    private AsyncAlertWorker asyncAlertWorker;

    @Transactional
    public ReorderCheckSummaryResponse checkReorderLevels() {
        List<RawMaterial> materials = rawMaterialRepository.findByIsActiveTrue();
        Plant defaultPlant = plantRepository.findByIsActiveTrue().stream().findFirst()
                .orElseGet(() -> plantRepository.findAll().stream().findFirst().orElse(null));

        int totalEvaluated = 0;
        int lowStockCount = 0;
        int criticalStockCount = 0;
        List<PurchaseRecommendationResponse> createdRecommendations = new ArrayList<>();

        for (RawMaterial material : materials) {
            if (material.getReorderLevel() == null || material.getReorderLevel().compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            totalEvaluated++;
            BigDecimal currentStock = inventoryRepository.getTotalAvailableRawMaterial(material.getMaterialId());
            if (currentStock == null) {
                currentStock = BigDecimal.ZERO;
            }

            BigDecimal reorderLevel = material.getReorderLevel();
            BigDecimal safetyStock = material.getSafetyStock() != null ? material.getSafetyStock() : BigDecimal.ZERO;

            if (currentStock.compareTo(reorderLevel) <= 0) {
                lowStockCount++;

                String priority = "Medium";
                if (currentStock.compareTo(safetyStock) <= 0) {
                    priority = "Critical";
                    criticalStockCount++;
                } else if (reorderLevel.compareTo(BigDecimal.ZERO) > 0 &&
                           currentStock.compareTo(reorderLevel.multiply(new BigDecimal("0.5"))) <= 0) {
                    priority = "High";
                }

                // Check if an unfulfilled recommendation already exists
                List<PurchaseRecommendation> existingRecs = purchaseRecommendationRepository
                        .findByMaterial_MaterialIdAndStatusIn(material.getMaterialId(), List.of("New", "InReview", "Approved"));

                if (existingRecs.isEmpty()) {
                    BigDecimal targetStock = reorderLevel.multiply(BigDecimal.valueOf(2));
                    BigDecimal needed = targetStock.subtract(currentStock);
                    BigDecimal recommendedQty = needed.max(safetyStock).max(new BigDecimal("100.0000"));
                    BigDecimal costPerUnit = material.getStandardCost() != null ? material.getStandardCost() : BigDecimal.ZERO;
                    BigDecimal estimatedCost = recommendedQty.multiply(costPerUnit);

                    PurchaseRecommendation recommendation = PurchaseRecommendation.builder()
                            .material(material)
                            .plant(defaultPlant)
                            .recommendedDate(LocalDate.now())
                            .recommendedQty(recommendedQty)
                            .estimatedCost(estimatedCost)
                            .safetyStock(safetyStock)
                            .currentStock(currentStock)
                            .leadTimeDays(material.getLeadTimeDays() != null ? material.getLeadTimeDays() : 0)
                            .priority(priority)
                            .reason("Current stock (" + currentStock + " KG) is at or below reorder level (" +
                                    reorderLevel + " KG).")
                            .status("New")
                            .build();

                    PurchaseRecommendation savedRec = purchaseRecommendationRepository.save(recommendation);
                    createdRecommendations.add(mapToResponse(savedRec));

                    // Dispatch notification for low/critical stock
                    if (asyncAlertWorker != null) {
                        AlertSeverity severity = "Critical".equalsIgnoreCase(priority) ? AlertSeverity.CRITICAL :
                                ("High".equalsIgnoreCase(priority) ? AlertSeverity.HIGH : AlertSeverity.MEDIUM);

                        AlertMessage alert = AlertMessage.builder()
                                .correlationId(UUID.randomUUID().toString())
                                .alertType("RAW_MATERIAL_LOW_STOCK")
                                .severity(severity)
                                .sourceType("RAW_MATERIAL")
                                .sourceId(material.getMaterialCode())
                                .message("Low stock alert (" + priority + "): " + material.getMaterialName() +
                                        " [" + material.getMaterialCode() + "]. Current: " + currentStock +
                                        " KG, Reorder Level: " + reorderLevel + " KG, Safety: " + safetyStock + " KG.")
                                .timestamp(Instant.now())
                                .build();

                        asyncAlertWorker.processAlert(alert);
                    }
                }
            }
        }

        return ReorderCheckSummaryResponse.builder()
                .totalMaterialsEvaluated(totalEvaluated)
                .lowStockCount(lowStockCount)
                .criticalStockCount(criticalStockCount)
                .newRecommendationsCreated(createdRecommendations.size())
                .scanTimestamp(Instant.now())
                .generatedRecommendations(createdRecommendations)
                .build();
    }

    @Transactional(readOnly = true)
    public List<PurchaseRecommendationResponse> getRecommendations(String status, String priority) {
        List<PurchaseRecommendation> list;
        if (status != null && !status.isBlank()) {
            list = purchaseRecommendationRepository.findByStatus(status);
        } else if (priority != null && !priority.isBlank()) {
            list = purchaseRecommendationRepository.findByPriority(priority);
        } else {
            list = purchaseRecommendationRepository.findAll();
        }

        return list.stream().map(this::mapToResponse).toList();
    }

    @Transactional
    public PurchaseRecommendationResponse approveRecommendation(Long recommendationId, String currentUsername) {
        PurchaseRecommendation rec = purchaseRecommendationRepository.findById(recommendationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Purchase recommendation not found with ID: " + recommendationId));

        if ("Approved".equalsIgnoreCase(rec.getStatus()) || "Converted".equalsIgnoreCase(rec.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Recommendation is already " + rec.getStatus());
        }

        AppUser approver = null;
        if (currentUsername != null && !currentUsername.isBlank()) {
            approver = appUserRepository.findByUserName(currentUsername).orElse(null);
        }

        rec.setStatus("Approved");
        rec.setApprovedBy(approver);
        rec.setApprovedAt(OffsetDateTime.now());

        PurchaseRecommendation saved = purchaseRecommendationRepository.save(rec);
        return mapToResponse(saved);
    }

    private PurchaseRecommendationResponse mapToResponse(PurchaseRecommendation rec) {
        return PurchaseRecommendationResponse.builder()
                .recommendationId(rec.getRecommendationId())
                .materialId(rec.getMaterial() != null ? rec.getMaterial().getMaterialId() : null)
                .materialCode(rec.getMaterial() != null ? rec.getMaterial().getMaterialCode() : null)
                .materialName(rec.getMaterial() != null ? rec.getMaterial().getMaterialName() : null)
                .plantId(rec.getPlant() != null ? rec.getPlant().getPlantId() : null)
                .plantName(rec.getPlant() != null ? rec.getPlant().getPlantName() : null)
                .recommendedDate(rec.getRecommendedDate())
                .recommendedQty(rec.getRecommendedQty())
                .estimatedCost(rec.getEstimatedCost())
                .safetyStock(rec.getSafetyStock())
                .currentStock(rec.getCurrentStock())
                .leadTimeDays(rec.getLeadTimeDays())
                .priority(rec.getPriority())
                .reason(rec.getReason())
                .status(rec.getStatus())
                .approvedByUserName(rec.getApprovedBy() != null ? rec.getApprovedBy().getUserName() : null)
                .approvedAt(rec.getApprovedAt())
                .build();
    }
}

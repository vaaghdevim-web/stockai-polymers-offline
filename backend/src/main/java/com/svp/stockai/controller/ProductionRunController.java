package com.svp.stockai.controller;

import com.svp.stockai.dto.ProductionRunResponse;
import com.svp.stockai.dto.ProductionStageResponse;
import com.svp.stockai.entity.ProductionRun;
import com.svp.stockai.entity.ProductionStage;
import com.svp.stockai.repository.ProductionRunRepository;
import com.svp.stockai.repository.ProductionStageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping({"/api/v1/production-runs", "/api/v1/production/runs", "/api/v1/production"})
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'MANAGER', 'ADMIN', 'PRODUCTION_MANAGER', 'PLANT_MANAGER', 'QUALITY_MANAGER', 'STORE_MANAGER', 'WAREHOUSE_INCHARGE', 'WAREHOUSE_EXECUTIVE', 'DISPATCH_EXECUTIVE', 'AUDITOR', 'FACTORY_DIRECTOR', 'ACCOUNTS_TEAM')")
public class ProductionRunController {

    private final ProductionRunRepository productionRunRepository;
    private final ProductionStageRepository productionStageRepository;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<ProductionRunResponse>> getAllProductionRuns(
            @RequestParam(required = false) Long plantId,
            @RequestParam(required = false) String status) {

        List<ProductionRun> runs;

        if (plantId != null && status != null && !status.isBlank()) {
            runs = productionRunRepository.findByPlant_PlantIdAndStatus(plantId, status);
        } else if (status != null && !status.isBlank()) {
            runs = productionRunRepository.findByStatus(status);
        } else {
            runs = productionRunRepository.findAll();
        }

        List<ProductionRunResponse> response = runs.stream()
                .map(this::mapToResponse)
                .toList();

        return ResponseEntity.ok(response);
    }

    @GetMapping({"/wip", "/runs/wip"})
    @Transactional(readOnly = true)
    public ResponseEntity<List<ProductionRunResponse>> getWipProductionRuns(
            @RequestParam(required = false) Long plantId) {
        List<ProductionRun> runs = (plantId != null)
                ? productionRunRepository.findWipRunsByPlantId(plantId)
                : productionRunRepository.findWipRuns();

        List<ProductionRunResponse> response = runs.stream()
                .map(this::mapToResponse)
                .toList();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{productionId}")
    @Transactional(readOnly = true)
    public ResponseEntity<ProductionRunResponse> getProductionRunById(@PathVariable Long productionId) {
        ProductionRun run = productionRunRepository.findById(productionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Production run not found with ID: " + productionId));

        return ResponseEntity.ok(mapToResponse(run));
    }

    @Transactional(readOnly = true)
    public ProductionRunResponse mapToResponse(ProductionRun run) {
        Long productId = null;
        String productName = null;
        String productCode = null;

        if (run.getBom() != null && run.getBom().getProduct() != null) {
            productId = run.getBom().getProduct().getProductId();
            productName = run.getBom().getProduct().getProductName();
            productCode = run.getBom().getProduct().getProductCode();
        }

        List<ProductionStage> stageEntities = productionStageRepository
                .findByProductionRun_ProductionIdOrderBySequenceNoAsc(run.getProductionId());

        List<ProductionStageResponse> stages = stageEntities.stream()
                .map(this::mapStageToResponse)
                .toList();

        String currentStage = null;
        Integer currentStageSequence = null;

        ProductionStage activeStage = stageEntities.stream()
                .filter(s -> "Running".equalsIgnoreCase(s.getStatus()) || "InProgress".equalsIgnoreCase(s.getStatus()))
                .findFirst()
                .orElseGet(() -> stageEntities.stream()
                        .filter(s -> "Ready".equalsIgnoreCase(s.getStatus()) || "Pending".equalsIgnoreCase(s.getStatus()))
                        .findFirst()
                        .orElse(null));

        if (activeStage != null) {
            currentStageSequence = activeStage.getSequenceNo();
            if (activeStage.getUnit() != null && activeStage.getUnit().getUnitName() != null) {
                currentStage = activeStage.getUnit().getUnitName();
            } else if (activeStage.getUnit() != null && activeStage.getUnit().getUnitType() != null) {
                currentStage = activeStage.getUnit().getUnitType();
            } else {
                currentStage = "Stage " + activeStage.getSequenceNo();
            }
        } else if ("Completed".equalsIgnoreCase(run.getStatus())) {
            currentStage = "Completed";
        }

        return ProductionRunResponse.builder()
                .productionId(run.getProductionId())
                .plantId(run.getPlant() != null ? run.getPlant().getPlantId() : null)
                .plantName(run.getPlant() != null ? run.getPlant().getPlantName() : null)
                .bomId(run.getBom() != null ? run.getBom().getBomId() : null)
                .productId(productId)
                .productName(productName)
                .productCode(productCode)
                .productionNumber(run.getProductionNumber())
                .startDatetime(run.getStartDatetime())
                .endDatetime(run.getEndDatetime())
                .status(run.getStatus())
                .currentStage(currentStage)
                .currentStageSequence(currentStageSequence)
                .plannedQty(run.getPlannedQty())
                .actualQty(run.getActualQty())
                .inputWeightKg(run.getInputWeightKg())
                .outputWeightKg(run.getOutputWeightKg())
                .scrapWeightKg(run.getScrapWeightKg())
                .yieldPercentage(run.getYieldPercentage())
                .bagsProduced(run.getBagsProduced())
                .bagsPerKg(run.getBagsPerKg())
                .stages(stages)
                .createdAt(run.getCreatedAt())
                .updatedAt(run.getUpdatedAt())
                .build();
    }

    private ProductionStageResponse mapStageToResponse(ProductionStage stage) {
        String stageName = stage.getUnit() != null ? stage.getUnit().getUnitName() : "Stage " + stage.getSequenceNo();
        Long unitId = stage.getUnit() != null ? stage.getUnit().getUnitId() : null;
        String unitCode = stage.getUnit() != null ? stage.getUnit().getUnitCode() : null;
        String unitName = stage.getUnit() != null ? stage.getUnit().getUnitName() : null;
        Long machineId = stage.getMachine() != null ? stage.getMachine().getMachineId() : null;
        String machineCode = stage.getMachine() != null ? stage.getMachine().getMachineCode() : null;
        String machineName = stage.getMachine() != null ? stage.getMachine().getMachineName() : null;

        return new ProductionStageResponse(
                stage.getStageId(),
                stage.getProductionRun() != null ? stage.getProductionRun().getProductionId() : null,
                stage.getSequenceNo() != null ? stage.getSequenceNo() : 0,
                stageName,
                stage.getStatus(),
                unitId,
                unitCode,
                unitName,
                machineId,
                machineCode,
                machineName,
                stage.getInputWeightKg(),
                stage.getOutputWeightKg(),
                stage.getScrapWeightKg(),
                stage.getStartedAt(),
                stage.getCompletedAt()
        );
    }
}

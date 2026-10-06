package com.svp.stockai.service;

import com.svp.stockai.dto.CompleteProductionStageRequest;
import com.svp.stockai.dto.CreateProductionRunRequest;
import com.svp.stockai.dto.ProductionRunResponse;
import com.svp.stockai.dto.ProductionStageResponse;
import com.svp.stockai.entity.*;
import com.svp.stockai.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductionStateService {
    private static final BigDecimal BALANCE_TOLERANCE = new BigDecimal("0.0001");

    private final ProductionRunRepository productionRunRepository;
    private final ProductionStageRepository productionStageRepository;
    private final UnitOperationRepository unitOperationRepository;
    private final PlantRepository plantRepository;
    private final BomRepository bomRepository;
    private final CompoundingBomRepository compoundingBomRepository;
    private final ProductionUnitRepository productionUnitRepository;
    private final MachineRepository machineRepository;
    private final AppUserRepository appUserRepository;
    private final FinishedProductRepository finishedProductRepository;
    private final FinishedBatchRepository finishedBatchRepository;
    private final ProductionOutputRepository productionOutputRepository;

    @Transactional
    public ProductionRunResponse createProductionRun(CreateProductionRunRequest request, String username) {
        if (request == null || request.getPlannedQty() == null || request.getPlannedQty().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Planned quantity must be greater than 0");
        }

        // 1. Resolve Plant
        Plant plant = null;
        if (request.getPlantId() != null) {
            plant = plantRepository.findById(request.getPlantId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Plant not found: " + request.getPlantId()));
        } else {
            plant = plantRepository.findAll().stream().findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No plant found in system"));
        }

        // 2. Resolve BOM
        Bom bom = null;
        if (request.getBomId() != null) {
            bom = bomRepository.findById(request.getBomId()).orElse(null);
            if (bom == null) {
                var compoundingBom = compoundingBomRepository.findById(request.getBomId()).orElse(null);
                if (compoundingBom != null) {
                    bom = bomRepository.findFirstByStatus("Active")
                            .or(() -> bomRepository.findAll().stream().findFirst())
                            .orElse(null);
                }
            }
        }
        if (bom == null) {
            bom = bomRepository.findFirstByStatus("Active")
                    .or(() -> bomRepository.findAll().stream().findFirst())
                    .orElseGet(() -> {
                        FinishedProduct prod = finishedProductRepository.findAll().stream().findFirst()
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No finished product found for BOM"));
                        return bomRepository.save(Bom.builder()
                                .product(prod)
                                .version("v1.0-STD")
                                .effectiveFrom(java.time.LocalDate.now())
                                .yieldQuantity(new BigDecimal("1000.0000"))
                                .status("Active")
                                .build());
                    });
        }

        // 3. Resolve Production Number
        String prodNumber = request.getProductionNumber();
        if (prodNumber == null || prodNumber.isBlank()) {
            long count = productionRunRepository.count() + 1;
            prodNumber = String.format("PR-%d-%03d", java.time.LocalDate.now().getYear(), count);
        }
        if (productionRunRepository.findByProductionNumber(prodNumber).isPresent()) {
            prodNumber = prodNumber + "-" + (System.currentTimeMillis() % 10000);
        }

        // 4. Resolve Creator
        AppUser creator = null;
        if (username != null) {
            creator = appUserRepository.findByUserName(username).orElse(null);
        }

        // 5. Create and Save Production Run
        ProductionRun run = ProductionRun.builder()
                .plant(plant)
                .bom(bom)
                .productionNumber(prodNumber)
                .status("Planned")
                .plannedQty(request.getPlannedQty())
                .actualQty(BigDecimal.ZERO)
                .inputWeightKg(request.getPlannedQty())
                .outputWeightKg(BigDecimal.ZERO)
                .scrapWeightKg(BigDecimal.ZERO)
                .createdBy(creator)
                .build();

        ProductionRun savedRun = productionRunRepository.save(run);

        // 6. Resolve / Ensure the 3 Production Units (Extrusion, Weaving, Conversion)
        List<ProductionUnit> units = productionUnitRepository.findByPlant_PlantIdOrderBySequenceNoAsc(plant.getPlantId());
        if (units.isEmpty()) {
            units = productionUnitRepository.findByOrderBySequenceNoAsc();
        }

        final Plant finalPlant = plant;
        ProductionUnit u1 = units.stream().filter(u -> "Extrusion".equalsIgnoreCase(u.getUnitType()) || (u.getSequenceNo() != null && u.getSequenceNo() == 1)).findFirst()
                .orElseGet(() -> productionUnitRepository.save(ProductionUnit.builder().plant(finalPlant).unitCode("PU-EXT-01").unitName("Extrusion Tape Line Unit").unitType("Extrusion").sequenceNo(1).isActive(true).build()));
        ProductionUnit u2 = units.stream().filter(u -> "Weaving".equalsIgnoreCase(u.getUnitType()) || (u.getSequenceNo() != null && u.getSequenceNo() == 2)).findFirst()
                .orElseGet(() -> productionUnitRepository.save(ProductionUnit.builder().plant(finalPlant).unitCode("PU-WEAV-01").unitName("Circular Loom Weaving Unit").unitType("Weaving").sequenceNo(2).isActive(true).build()));
        ProductionUnit u3 = units.stream().filter(u -> "Conversion".equalsIgnoreCase(u.getUnitType()) || (u.getSequenceNo() != null && u.getSequenceNo() == 3)).findFirst()
                .orElseGet(() -> productionUnitRepository.save(ProductionUnit.builder().plant(finalPlant).unitCode("PU-CONV-01").unitName("Conversion & Finishing Unit").unitType("Conversion").sequenceNo(3).isActive(true).build()));

        // 7. Resolve Machines
        Machine m1 = null;
        if (request.getMachineId() != null) {
            m1 = machineRepository.findById(request.getMachineId()).orElse(null);
        }
        if (m1 == null) {
            m1 = machineRepository.findAll().stream()
                    .filter(m -> m.getUnit() != null && "Extrusion".equalsIgnoreCase(m.getUnit().getUnitType()))
                    .findFirst().orElse(null);
        }

        Machine m2 = machineRepository.findAll().stream()
                .filter(m -> m.getUnit() != null && "Weaving".equalsIgnoreCase(m.getUnit().getUnitType()))
                .findFirst().orElse(null);

        Machine m3 = machineRepository.findAll().stream()
                .filter(m -> m.getUnit() != null && "Conversion".equalsIgnoreCase(m.getUnit().getUnitType()))
                .findFirst().orElse(null);

        // 8. Create Stages
        ProductionStage stage1 = ProductionStage.builder()
                .productionRun(savedRun)
                .unit(u1)
                .machine(m1)
                .sequenceNo(1)
                .status("Ready")
                .inputWeightKg(BigDecimal.ZERO)
                .outputWeightKg(BigDecimal.ZERO)
                .scrapWeightKg(BigDecimal.ZERO)
                .build();

        ProductionStage stage2 = ProductionStage.builder()
                .productionRun(savedRun)
                .unit(u2)
                .machine(m2)
                .sequenceNo(2)
                .status("Pending")
                .inputWeightKg(BigDecimal.ZERO)
                .outputWeightKg(BigDecimal.ZERO)
                .scrapWeightKg(BigDecimal.ZERO)
                .build();

        ProductionStage stage3 = ProductionStage.builder()
                .productionRun(savedRun)
                .unit(u3)
                .machine(m3)
                .sequenceNo(3)
                .status("Pending")
                .inputWeightKg(BigDecimal.ZERO)
                .outputWeightKg(BigDecimal.ZERO)
                .scrapWeightKg(BigDecimal.ZERO)
                .build();

        List<ProductionStage> savedStages = productionStageRepository.saveAll(List.of(stage1, stage2, stage3));
        List<ProductionStageResponse> stageResponses = savedStages.stream().map(this::response).toList();

        Long prodId = null;
        String prodName = null;
        String prodCode = null;
        if (bom.getProduct() != null) {
            prodId = bom.getProduct().getProductId();
            prodName = bom.getProduct().getProductName();
            prodCode = bom.getProduct().getProductCode();
        }

        return ProductionRunResponse.builder()
                .productionId(savedRun.getProductionId())
                .plantId(plant.getPlantId())
                .plantName(plant.getPlantName())
                .bomId(bom.getBomId())
                .productId(prodId)
                .productName(prodName)
                .productCode(prodCode)
                .productionNumber(savedRun.getProductionNumber())
                .status(savedRun.getStatus())
                .currentStage(u1.getUnitName())
                .currentStageSequence(1)
                .plannedQty(savedRun.getPlannedQty())
                .actualQty(savedRun.getActualQty())
                .inputWeightKg(savedRun.getInputWeightKg())
                .outputWeightKg(savedRun.getOutputWeightKg())
                .scrapWeightKg(savedRun.getScrapWeightKg())
                .stages(stageResponses)
                .createdAt(savedRun.getCreatedAt())
                .updatedAt(savedRun.getUpdatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public ProductionStageResponse getStage(Long productionId, Long stageId) {
        ProductionStage stage = lockedStage(productionId, stageId);
        return response(stage);
    }

    @Transactional
    public ProductionStageResponse start(Long productionId, Long stageId) {
        ProductionStage stage = lockedStage(productionId, stageId);
        assertConfiguredStage(stage);
        List<ProductionStage> stages = configuredStages(productionId);
        assertPreviousCompleted(stages, stage);
        if (!"Pending".equals(stage.getStatus()) && !"Ready".equals(stage.getStatus())) {
            throw invalidState(stage, "started");
        }
        OffsetDateTime now = OffsetDateTime.now();
        stage.setStatus("Running");
        stage.setStartedAt(now);
        var run = productionRunRepository.findById(productionId).orElseThrow(() -> notFound("Production run", productionId));
        if ("Planned".equals(run.getStatus())) {
            run.setStatus("InProgress");
        }
        if (stage.getSequenceNo() == ProductionFlowStage.UNIT_1_EXTRUSION.sequenceNo()
                && run.getStartDatetime() == null) {
            run.setStartDatetime(now);
        }
        return response(productionStageRepository.save(stage));
    }

    @Transactional
    public ProductionStageResponse complete(Long productionId, Long stageId, CompleteProductionStageRequest request) {
        ProductionStage stage = lockedStage(productionId, stageId);
        assertConfiguredStage(stage);
        List<ProductionStage> stages = configuredStages(productionId);
        if (!"Running".equals(stage.getStatus())) throw invalidState(stage, "completed");
        if (request.inputWeightKg().subtract(request.outputWeightKg().add(request.scrapWeightKg())).abs()
                .compareTo(BALANCE_TOLERANCE) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "inputWeightKg must equal outputWeightKg + scrapWeightKg");
        }

        if (stage.getSequenceNo() > 1) {
            ProductionStage prevStage = stages.stream()
                    .filter(s -> s.getSequenceNo() == stage.getSequenceNo() - 1)
                    .findFirst().orElse(null);
            if (prevStage != null && prevStage.getOutputWeightKg() != null &&
                    prevStage.getOutputWeightKg().compareTo(BigDecimal.ZERO) > 0 &&
                    request.inputWeightKg().compareTo(prevStage.getOutputWeightKg().add(BALANCE_TOLERANCE)) > 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Input weight (" + request.inputWeightKg() + " kg) cannot exceed previous stage output (" + prevStage.getOutputWeightKg() + " kg)");
            }
        }

        OffsetDateTime now = OffsetDateTime.now();
        stage.setInputWeightKg(request.inputWeightKg());
        stage.setOutputWeightKg(request.outputWeightKg());
        stage.setScrapWeightKg(request.scrapWeightKg());
        stage.setStatus("Completed");
        stage.setCompletedAt(now);
        unitOperationRepository.save(UnitOperation.builder().productionRun(stage.getProductionRun()).stage(stage)
                .unit(stage.getUnit()).machine(stage.getMachine()).operationType("Production")
                .compoundingBatch(stage.getProductionRun().getCompoundingBatch())
                .inputWeightKg(request.inputWeightKg()).outputWeightKg(request.outputWeightKg())
                .scrapWeightKg(request.scrapWeightKg()).startedAt(stage.getStartedAt()).completedAt(now).build());
        stages.stream().filter(next -> next.getSequenceNo() == stage.getSequenceNo() + 1 && "Pending".equals(next.getStatus()))
                .findFirst().ifPresent(next -> { next.setStatus("Ready"); productionStageRepository.save(next); });
        
        if (stages.stream().allMatch(item -> "Completed".equals(item.getStatus()) || item.getStageId().equals(stage.getStageId()))) {
            var run = productionRunRepository.findById(productionId).orElseThrow(() -> notFound("Production run", productionId));
            run.setStatus("Completed");
            run.setEndDatetime(now);
            productionRunRepository.save(run);

            if (finishedBatchRepository != null && productionOutputRepository != null) {
                String fbBatchNo = "FB-" + run.getProductionNumber();
                if (finishedBatchRepository.findByBatchNo(fbBatchNo).isEmpty()) {
                    FinishedProduct product = (run.getBom() != null && run.getBom().getProduct() != null) ? run.getBom().getProduct() :
                            finishedProductRepository.findAll().stream().findFirst().orElse(null);
                    if (product != null) {
                        BigDecimal outputKg = request.outputWeightKg() != null ? request.outputWeightKg() : BigDecimal.ZERO;
                        BigDecimal bagWeightG = new BigDecimal("75.00");
                        BigDecimal bagsProduced = BigDecimal.ZERO;
                        if (bagWeightG.compareTo(BigDecimal.ZERO) > 0) {
                            bagsProduced = outputKg.multiply(new BigDecimal("1000")).divide(bagWeightG, 0, java.math.RoundingMode.HALF_UP);
                        }

                        FinishedBatch fb = FinishedBatch.builder()
                                .product(product)
                                .batchNo(fbBatchNo)
                                .productionDate(java.time.LocalDate.now())
                                .expiryDate(java.time.LocalDate.now().plusYears(1))
                                .qtyProduced(outputKg)
                                .outputWeightKg(outputKg)
                                .inputWeightKg(request.inputWeightKg())
                                .scrapWeightKg(request.scrapWeightKg())
                                .bagsProduced(bagsProduced)
                                .averageBagWeightG(bagWeightG)
                                .qualityStatus("Available")
                                .isActive(true)
                                .build();
                        FinishedBatch savedFb = finishedBatchRepository.save(fb);

                        ProductionOutput prodOut = ProductionOutput.builder()
                                .productionRun(run)
                                .finishedBatch(savedFb)
                                .producedQty(outputKg)
                                .outputWeightKg(outputKg)
                                .outputBags(bagsProduced)
                                .build();
                        productionOutputRepository.save(prodOut);
                    }
                }
            }
        }
        return response(productionStageRepository.save(stage));
    }

    @Transactional(readOnly = true)
    public List<ProductionStageResponse> getStages(Long productionId) {
        if (!productionRunRepository.existsById(productionId)) {
            throw notFound("Production run", productionId);
        }
        return productionStageRepository.findByProductionRun_ProductionIdOrderBySequenceNoAsc(productionId)
                .stream()
                .map(this::response)
                .toList();
    }

    private ProductionStage lockedStage(Long productionId, Long stageId) {
        return productionStageRepository.findByIdAndProductionIdWithLock(stageId, productionId)
                .orElseThrow(() -> notFound("Production stage", stageId));
    }
    private List<ProductionStage> configuredStages(Long productionId) {
        List<ProductionStage> stages = productionStageRepository
                .findByProductionRun_ProductionIdOrderBySequenceNoAsc(productionId);
        if (stages.size() != ProductionFlowStage.values().length) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Production run must contain the three configured production stages");
        }
        for (ProductionFlowStage expected : ProductionFlowStage.values()) {
            boolean configured = stages.stream().anyMatch(expected::matches);
            if (!configured) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Production stage configuration must follow UNIT_1_EXTRUSION, UNIT_2_WEAVING, UNIT_3_CONVERSION");
            }
        }
        return stages;
    }
    private void assertConfiguredStage(ProductionStage stage) {
        for (ProductionFlowStage expected : ProductionFlowStage.values()) {
            if (expected.matches(stage)) {
                return;
            }
        }
        throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Production stage configuration must follow UNIT_1_EXTRUSION, UNIT_2_WEAVING, UNIT_3_CONVERSION");
    }
    private void assertPreviousCompleted(List<ProductionStage> stages, ProductionStage stage) {
        boolean predecessorIncomplete = stages.stream()
                .anyMatch(candidate -> candidate.getSequenceNo() < stage.getSequenceNo() && !"Completed".equals(candidate.getStatus()));
        if (predecessorIncomplete) throw new ResponseStatusException(HttpStatus.CONFLICT, "Previous production unit must be completed first");
    }
    private ResponseStatusException invalidState(ProductionStage stage, String action) {
        return new ResponseStatusException(HttpStatus.CONFLICT, "Stage " + stage.getStageId() + " cannot be " + action + " from " + stage.getStatus());
    }
    private ResponseStatusException notFound(String type, Long id) { return new ResponseStatusException(HttpStatus.NOT_FOUND, type + " " + id + " was not found"); }
    private ProductionStageResponse response(ProductionStage stage) {
        String stageName = stage.getUnit() != null ? stage.getUnit().getUnitType() : "Stage " + stage.getSequenceNo();
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

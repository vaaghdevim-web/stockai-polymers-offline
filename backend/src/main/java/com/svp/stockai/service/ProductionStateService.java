package com.svp.stockai.service;

import com.svp.stockai.dto.CompleteProductionStageRequest;
import com.svp.stockai.dto.ProductionStageResponse;
import com.svp.stockai.entity.ProductionFlowStage;
import com.svp.stockai.entity.ProductionStage;
import com.svp.stockai.entity.UnitOperation;
import com.svp.stockai.repository.ProductionRunRepository;
import com.svp.stockai.repository.ProductionStageRepository;
import com.svp.stockai.repository.UnitOperationRepository;
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
        if (stages.stream().allMatch(item -> "Completed".equals(item.getStatus()))) {
            var run = productionRunRepository.findById(productionId).orElseThrow(() -> notFound("Production run", productionId));
            run.setStatus("Completed"); run.setEndDatetime(now);
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

package com.svp.stockai.service;

import com.svp.stockai.dto.CompleteProductionStageRequest;
import com.svp.stockai.entity.CompoundingBatch;
import com.svp.stockai.entity.ProductionRun;
import com.svp.stockai.entity.ProductionStage;
import com.svp.stockai.entity.ProductionUnit;
import com.svp.stockai.entity.UnitOperation;
import com.svp.stockai.repository.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class ProductionStateServiceTest {

    private static ProductionStateService newService(ProductionRunRepository runs, ProductionStageRepository stages, UnitOperationRepository operations) {
        return new ProductionStateService(
                runs != null ? runs : mock(ProductionRunRepository.class),
                stages != null ? stages : mock(ProductionStageRepository.class),
                operations != null ? operations : mock(UnitOperationRepository.class),
                mock(PlantRepository.class),
                mock(BomRepository.class),
                mock(CompoundingBomRepository.class),
                mock(ProductionUnitRepository.class),
                mock(MachineRepository.class),
                mock(AppUserRepository.class),
                mock(FinishedProductRepository.class),
                mock(FinishedBatchRepository.class),
                mock(ProductionOutputRepository.class)
        );
    }

    @Test
    void cannotStartUnitTwoBeforeUnitOneCompletes() {
        ProductionStageRepository stages = mock(ProductionStageRepository.class);
        ProductionRunRepository runs = mock(ProductionRunRepository.class);
        UnitOperationRepository operations = mock(UnitOperationRepository.class);
        ProductionStateService service = newService(runs, stages, operations);

        ProductionRun run = ProductionRun.builder().productionId(91L).status("Planned").build();
        ProductionStage unitOne = stage(1L, run, 1, "Extrusion", "Running");
        ProductionStage unitTwo = stage(2L, run, 2, "Weaving", "Pending");
        ProductionStage unitThree = stage(3L, run, 3, "Conversion", "Pending");
        when(stages.findByIdAndProductionIdWithLock(2L, 91L)).thenReturn(Optional.of(unitTwo));
        when(stages.findByProductionRun_ProductionIdOrderBySequenceNoAsc(91L)).thenReturn(List.of(unitOne, unitTwo, unitThree));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> service.start(91L, 2L));

        assertEquals(409, exception.getStatusCode().value());
    }

    @Test
    void completionBalancesMaterialAndReadiesNextStage() {
        ProductionStageRepository stages = mock(ProductionStageRepository.class);
        ProductionRunRepository runs = mock(ProductionRunRepository.class);
        UnitOperationRepository operations = mock(UnitOperationRepository.class);
        ProductionStateService service = newService(runs, stages, operations);
        ProductionRun run = ProductionRun.builder().productionId(91L).status("InProgress").build();
        ProductionStage running = stage(1L, run, 1, "Extrusion", "Running");
        ProductionStage next = stage(2L, run, 2, "Weaving", "Pending");
        ProductionStage unitThree = stage(3L, run, 3, "Conversion", "Pending");
        when(stages.findByIdAndProductionIdWithLock(1L, 91L)).thenReturn(Optional.of(running));
        when(stages.findByProductionRun_ProductionIdOrderBySequenceNoAsc(91L)).thenReturn(List.of(running, next, unitThree));
        when(stages.save(any(ProductionStage.class))).thenAnswer(call -> call.getArgument(0));

        var response = service.complete(91L, 1L,
                new CompleteProductionStageRequest(new java.math.BigDecimal("10"), new java.math.BigDecimal("9"), new java.math.BigDecimal("1")));

        assertEquals("Completed", response.status());
        assertEquals("Ready", next.getStatus());
        verify(operations).save(any());
    }

    @Test
    void rejectsUnbalancedCompletion() {
        ProductionStageRepository stages = mock(ProductionStageRepository.class);
        ProductionStateService service = newService(null, stages, null);
        ProductionRun run = ProductionRun.builder().productionId(91L).build();
        ProductionStage running = stage(1L, run, 1, "Extrusion", "Running");
        ProductionStage unitTwo = stage(2L, run, 2, "Weaving", "Pending");
        ProductionStage unitThree = stage(3L, run, 3, "Conversion", "Pending");
        when(stages.findByIdAndProductionIdWithLock(1L, 91L)).thenReturn(Optional.of(running));
        when(stages.findByProductionRun_ProductionIdOrderBySequenceNoAsc(91L))
                .thenReturn(List.of(running, unitTwo, unitThree));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> service.complete(91L, 1L,
                new CompleteProductionStageRequest(java.math.BigDecimal.TEN, java.math.BigDecimal.ONE, java.math.BigDecimal.ONE)));

        assertEquals(400, exception.getStatusCode().value());
    }

    @Test
    void unitOneToUnitTwoProgressionStartsAndCompletes() {
        ProductionStageRepository stages = mock(ProductionStageRepository.class);
        ProductionRunRepository runs = mock(ProductionRunRepository.class);
        ProductionStateService service = newService(runs, stages, null);
        ProductionRun run = ProductionRun.builder().productionId(91L).status("Planned").build();
        ProductionStage unitOne = stage(1L, run, 1, "Extrusion", "Completed");
        ProductionStage unitTwo = stage(2L, run, 2, "Weaving", "Ready");
        ProductionStage unitThree = stage(3L, run, 3, "Conversion", "Pending");
        when(stages.findByIdAndProductionIdWithLock(2L, 91L)).thenReturn(Optional.of(unitTwo));
        when(stages.findByProductionRun_ProductionIdOrderBySequenceNoAsc(91L)).thenReturn(List.of(unitOne, unitTwo, unitThree));
        when(runs.findById(91L)).thenReturn(Optional.of(run));
        when(stages.save(any(ProductionStage.class))).thenAnswer(call -> call.getArgument(0));

        var response = service.start(91L, 2L);

        assertEquals("Running", response.status());
        assertEquals("InProgress", run.getStatus());
    }

    @Test
    void unitTwoCompletionReadiesUnitThree() {
        ProductionStageRepository stages = mock(ProductionStageRepository.class);
        ProductionStateService service = newService(null, stages, null);
        ProductionRun run = ProductionRun.builder().productionId(91L).status("InProgress").build();
        ProductionStage unitOne = stage(1L, run, 1, "Extrusion", "Completed");
        ProductionStage unitTwo = stage(2L, run, 2, "Weaving", "Running");
        ProductionStage unitThree = stage(3L, run, 3, "Conversion", "Pending");
        when(stages.findByIdAndProductionIdWithLock(2L, 91L)).thenReturn(Optional.of(unitTwo));
        when(stages.findByProductionRun_ProductionIdOrderBySequenceNoAsc(91L)).thenReturn(List.of(unitOne, unitTwo, unitThree));
        when(stages.save(any(ProductionStage.class))).thenAnswer(call -> call.getArgument(0));

        service.complete(91L, 2L, balancedRequest());

        assertEquals("Ready", unitThree.getStatus());
    }

    @Test
    void unitThreeCompletionCompletesProductionRun() {
        ProductionStageRepository stages = mock(ProductionStageRepository.class);
        ProductionRunRepository runs = mock(ProductionRunRepository.class);
        ProductionStateService service = newService(runs, stages, null);
        ProductionRun run = ProductionRun.builder().productionId(91L).status("InProgress").build();
        ProductionStage unitOne = stage(1L, run, 1, "Extrusion", "Completed");
        ProductionStage unitTwo = stage(2L, run, 2, "Weaving", "Completed");
        ProductionStage unitThree = stage(3L, run, 3, "Conversion", "Running");
        when(stages.findByIdAndProductionIdWithLock(3L, 91L)).thenReturn(Optional.of(unitThree));
        when(stages.findByProductionRun_ProductionIdOrderBySequenceNoAsc(91L)).thenReturn(List.of(unitOne, unitTwo, unitThree));
        when(runs.findById(91L)).thenReturn(Optional.of(run));
        when(stages.save(any(ProductionStage.class))).thenAnswer(call -> call.getArgument(0));

        service.complete(91L, 3L, balancedRequest());

        assertEquals("Completed", run.getStatus());
    }

    @Test
    void rejectsStartingFromPending() {
        ProductionStateService service = serviceForBlockedStart("Pending", "Pending", "Pending");

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> service.start(91L, 3L));

        assertEquals(409, exception.getStatusCode().value());
    }

    @Test
    void rejectsRestartingCompletedStage() {
        ProductionStateService service = serviceForBlockedStart("Completed", "Ready", "Pending");

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> service.start(91L, 1L));

        assertEquals(409, exception.getStatusCode().value());
    }

    @Test
    void rejectsMissingOrWrongRunStage() {
        ProductionStageRepository stages = mock(ProductionStageRepository.class);
        ProductionStateService service = newService(null, stages, null);
        when(stages.findByIdAndProductionIdWithLock(99L, 91L)).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> service.start(91L, 99L));

        assertEquals(404, exception.getStatusCode().value());
    }

    @Test
    void rejectsInvalidConfiguredStageUnit() {
        ProductionStageRepository stages = mock(ProductionStageRepository.class);
        ProductionStateService service = newService(null, stages, null);
        ProductionRun run = ProductionRun.builder().productionId(91L).build();
        ProductionStage unitOne = stage(1L, run, 1, "Weaving", "Pending");
        ProductionStage unitTwo = stage(2L, run, 2, "Weaving", "Pending");
        ProductionStage unitThree = stage(3L, run, 3, "Conversion", "Pending");
        when(stages.findByIdAndProductionIdWithLock(1L, 91L)).thenReturn(Optional.of(unitOne));
        when(stages.findByProductionRun_ProductionIdOrderBySequenceNoAsc(91L)).thenReturn(List.of(unitOne, unitTwo, unitThree));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> service.start(91L, 1L));

        assertEquals(409, exception.getStatusCode().value());
    }

    @Test
    void completionCarriesCompoundingBatchToUnitOperation() {
        ProductionStageRepository stages = mock(ProductionStageRepository.class);
        UnitOperationRepository operations = mock(UnitOperationRepository.class);
        ProductionStateService service = newService(null, stages, operations);
        CompoundingBatch batch = CompoundingBatch.builder().compoundingBatchId(7L).build();
        ProductionRun run = ProductionRun.builder().productionId(91L).status("InProgress").compoundingBatch(batch).build();
        ProductionStage unitOne = stage(1L, run, 1, "Extrusion", "Running");
        ProductionStage unitTwo = stage(2L, run, 2, "Weaving", "Pending");
        ProductionStage unitThree = stage(3L, run, 3, "Conversion", "Pending");
        when(stages.findByIdAndProductionIdWithLock(1L, 91L)).thenReturn(Optional.of(unitOne));
        when(stages.findByProductionRun_ProductionIdOrderBySequenceNoAsc(91L)).thenReturn(List.of(unitOne, unitTwo, unitThree));
        when(stages.save(any(ProductionStage.class))).thenAnswer(call -> call.getArgument(0));

        service.complete(91L, 1L, balancedRequest());

        ArgumentCaptor<UnitOperation> operation = ArgumentCaptor.forClass(UnitOperation.class);
        verify(operations).save(operation.capture());
        assertEquals(batch, operation.getValue().getCompoundingBatch());
    }

    @Test
    void firstStageStartSetsRunStartTimestampWithoutOverwritingIt() {
        ProductionStageRepository stages = mock(ProductionStageRepository.class);
        ProductionRunRepository runs = mock(ProductionRunRepository.class);
        ProductionStateService service = newService(runs, stages, null);
        ProductionRun run = ProductionRun.builder().productionId(91L).status("Planned").build();
        ProductionStage unitOne = stage(1L, run, 1, "Extrusion", "Pending");
        ProductionStage unitTwo = stage(2L, run, 2, "Weaving", "Pending");
        ProductionStage unitThree = stage(3L, run, 3, "Conversion", "Pending");
        when(stages.findByIdAndProductionIdWithLock(1L, 91L)).thenReturn(Optional.of(unitOne));
        when(stages.findByProductionRun_ProductionIdOrderBySequenceNoAsc(91L)).thenReturn(List.of(unitOne, unitTwo, unitThree));
        when(runs.findById(91L)).thenReturn(Optional.of(run));
        when(stages.save(any(ProductionStage.class))).thenAnswer(call -> call.getArgument(0));

        service.start(91L, 1L);

        assertEquals("InProgress", run.getStatus());
        org.junit.jupiter.api.Assertions.assertNotNull(run.getStartDatetime());
    }

    private static ProductionStateService serviceForBlockedStart(String firstStatus, String secondStatus, String thirdStatus) {
        ProductionStageRepository stages = mock(ProductionStageRepository.class);
        ProductionRun run = ProductionRun.builder().productionId(91L).build();
        ProductionStage unitOne = stage(1L, run, 1, "Extrusion", firstStatus);
        ProductionStage unitTwo = stage(2L, run, 2, "Weaving", secondStatus);
        ProductionStage unitThree = stage(3L, run, 3, "Conversion", thirdStatus);
        when(stages.findByIdAndProductionIdWithLock(eq(3L), eq(91L))).thenReturn(Optional.of(unitThree));
        when(stages.findByIdAndProductionIdWithLock(eq(1L), eq(91L))).thenReturn(Optional.of(unitOne));
        when(stages.findByProductionRun_ProductionIdOrderBySequenceNoAsc(91L)).thenReturn(List.of(unitOne, unitTwo, unitThree));
        return newService(null, stages, null);
    }

    private static ProductionStage stage(Long stageId, ProductionRun run, int sequence, String unitType, String status) {
        return ProductionStage.builder().stageId(stageId).productionRun(run).sequenceNo(sequence).status(status)
                .unit(ProductionUnit.builder().unitId((long) sequence).unitType(unitType).build()).build();
    }

    private static CompleteProductionStageRequest balancedRequest() {
        return new CompleteProductionStageRequest(new java.math.BigDecimal("10"), new java.math.BigDecimal("9"), new java.math.BigDecimal("1"));
    }
}

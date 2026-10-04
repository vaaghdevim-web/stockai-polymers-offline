package com.svp.stockai.service;

import com.svp.stockai.dto.QualityInspectionItemRequest;
import com.svp.stockai.dto.QualityInspectionRequest;
import com.svp.stockai.dto.QualityInspectionResponse;
import com.svp.stockai.entity.*;
import com.svp.stockai.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class QualityInspectionServiceTest {

    private QualityInspectionRepository qualityInspectionRepo;
    private QualityInspectionItemRepository qualityInspectionItemRepo;
    private QcSpecificationRepository qcSpecRepo;
    private MaterialBatchRepository materialBatchRepo;
    private ProductionRunRepository productionRunRepo;
    private FinishedBatchRepository finishedBatchRepo;
    private AppUserRepository userRepo;
    private AsyncAlertWorker alertWorker;
    private QualityInspectionService service;

    private MaterialBatch materialBatch;
    private FinishedBatch finishedBatch;
    private QcSpecification mfiSpec;

    @BeforeEach
    void setUp() {
        qualityInspectionRepo = mock(QualityInspectionRepository.class);
        qualityInspectionItemRepo = mock(QualityInspectionItemRepository.class);
        qcSpecRepo = mock(QcSpecificationRepository.class);
        materialBatchRepo = mock(MaterialBatchRepository.class);
        productionRunRepo = mock(ProductionRunRepository.class);
        finishedBatchRepo = mock(FinishedBatchRepository.class);
        userRepo = mock(AppUserRepository.class);
        alertWorker = mock(AsyncAlertWorker.class);

        service = new QualityInspectionService(
                qualityInspectionRepo,
                qualityInspectionItemRepo,
                qcSpecRepo,
                materialBatchRepo,
                productionRunRepo,
                finishedBatchRepo,
                userRepo
        );

        // Inject alert worker via reflection
        org.springframework.test.util.ReflectionTestUtils.setField(service, "asyncAlertWorker", alertWorker);

        materialBatch = MaterialBatch.builder()
                .batchId(10L)
                .batchNo("MB-2026-PP-001")
                .qualityStatus("Hold")
                .build();

        finishedBatch = FinishedBatch.builder()
                .finishedBatchId(20L)
                .batchNo("FB-2026-BAG-001")
                .qualityStatus("Hold")
                .build();

        mfiSpec = QcSpecification.builder()
                .qcSpecificationId(1L)
                .parameterName("Melt Flow Index (MFI)")
                .minimumValue(new BigDecimal("2.800000"))
                .maximumValue(new BigDecimal("3.400000"))
                .targetValue(new BigDecimal("3.100000"))
                .measurementUnit("g/10min")
                .isCritical(true)
                .isActive(true)
                .build();

        when(materialBatchRepo.findById(10L)).thenReturn(Optional.of(materialBatch));
        when(finishedBatchRepo.findById(20L)).thenReturn(Optional.of(finishedBatch));
        when(qcSpecRepo.findById(1L)).thenReturn(Optional.of(mfiSpec));
    }

    @Test
    @DisplayName("QC Inspection - Pass when all observed values are within spec")
    void recordInspection_Pass_AllWithinBounds() {
        QualityInspectionRequest request = QualityInspectionRequest.builder()
                .inspectionType("Incoming")
                .materialBatchId(10L)
                .remarks("Batch meets polymer specifications")
                .items(List.of(
                        QualityInspectionItemRequest.builder()
                                .qcSpecificationId(1L)
                                .parameterName("Melt Flow Index (MFI)")
                                .observedValue(new BigDecimal("3.150000"))
                                .build()
                ))
                .build();

        when(qualityInspectionRepo.save(any(QualityInspection.class))).thenAnswer(inv -> {
            QualityInspection qi = inv.getArgument(0);
            qi.setInspectionId(100L);
            return qi;
        });
        when(qualityInspectionItemRepo.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        QualityInspectionResponse response = service.recordInspection(request, "admin");

        assertNotNull(response);
        assertEquals("Pass", response.getStatus());
        assertEquals("Available", materialBatch.getQualityStatus());
        verify(materialBatchRepo).save(materialBatch);
        verifyNoInteractions(alertWorker);
    }

    @Test
    @DisplayName("QC Inspection - Fail when critical parameter exceeds tolerance and trigger alert")
    void recordInspection_Fail_CriticalParameterExceeded() {
        QualityInspectionRequest request = QualityInspectionRequest.builder()
                .inspectionType("Final")
                .finishedBatchId(20L)
                .remarks("High tensile test failure")
                .items(List.of(
                        QualityInspectionItemRequest.builder()
                                .qcSpecificationId(1L)
                                .parameterName("Melt Flow Index (MFI)")
                                .observedValue(new BigDecimal("4.500000")) // exceeds max 3.4
                                .build()
                ))
                .build();

        when(qualityInspectionRepo.save(any(QualityInspection.class))).thenAnswer(inv -> {
            QualityInspection qi = inv.getArgument(0);
            qi.setInspectionId(200L);
            return qi;
        });
        when(qualityInspectionItemRepo.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        QualityInspectionResponse response = service.recordInspection(request, "supervisor");

        assertNotNull(response);
        assertEquals("Fail", response.getStatus());
        assertEquals("Quarantine", finishedBatch.getQualityStatus());
        verify(finishedBatchRepo).save(finishedBatch);
        verify(alertWorker, times(1)).processAlert(any());
    }

    @Test
    @DisplayName("QC Inspection - Throws Bad Request when no batch reference is supplied")
    void recordInspection_WithoutBatch_ThrowsBadRequest() {
        QualityInspectionRequest request = QualityInspectionRequest.builder()
                .inspectionType("InProcess")
                .items(List.of(
                        QualityInspectionItemRequest.builder()
                                .parameterName("Tensile Strength")
                                .observedValue(new BigDecimal("25.0"))
                                .build()
                ))
                .build();

        assertThrows(ResponseStatusException.class, () -> service.recordInspection(request, "operator"));
    }

    @Test
    @DisplayName("QC Inspection - Get inspection by ID")
    void getInspectionById_Success() {
        QualityInspection qi = QualityInspection.builder()
                .inspectionId(55L)
                .materialBatch(materialBatch)
                .inspectionType("Incoming")
                .status("Pass")
                .build();

        when(qualityInspectionRepo.findById(55L)).thenReturn(Optional.of(qi));
        when(qualityInspectionItemRepo.findByInspection_InspectionId(55L)).thenReturn(List.of());

        QualityInspectionResponse response = service.getInspectionById(55L);
        assertNotNull(response);
        assertEquals(55L, response.getInspectionId());
        assertEquals("Pass", response.getStatus());
    }
}

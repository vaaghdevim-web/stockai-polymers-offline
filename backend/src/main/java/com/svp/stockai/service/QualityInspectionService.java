package com.svp.stockai.service;

import com.svp.stockai.dto.*;
import com.svp.stockai.entity.*;
import com.svp.stockai.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class QualityInspectionService {

    private final QualityInspectionRepository qualityInspectionRepository;
    private final QualityInspectionItemRepository qualityInspectionItemRepository;
    private final QcSpecificationRepository qcSpecificationRepository;
    private final MaterialBatchRepository materialBatchRepository;
    private final ProductionRunRepository productionRunRepository;
    private final FinishedBatchRepository finishedBatchRepository;
    private final AppUserRepository appUserRepository;

    @Autowired(required = false)
    private AsyncAlertWorker asyncAlertWorker;

    @Transactional
    public QualityInspectionResponse recordInspection(QualityInspectionRequest request, String currentUsername) {
        if (request.getMaterialBatchId() == null &&
            request.getProductionRunId() == null &&
            request.getFinishedBatchId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "QC Inspection must be associated with at least one Material Batch, Production Run, or Finished Batch");
        }

        MaterialBatch materialBatch = null;
        if (request.getMaterialBatchId() != null) {
            materialBatch = materialBatchRepository.findById(request.getMaterialBatchId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Material Batch not found with ID: " + request.getMaterialBatchId()));
        }

        ProductionRun productionRun = null;
        if (request.getProductionRunId() != null) {
            productionRun = productionRunRepository.findById(request.getProductionRunId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Production Run not found with ID: " + request.getProductionRunId()));
        }

        FinishedBatch finishedBatch = null;
        if (request.getFinishedBatchId() != null) {
            finishedBatch = finishedBatchRepository.findById(request.getFinishedBatchId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Finished Batch not found with ID: " + request.getFinishedBatchId()));
        }

        AppUser inspector = null;
        if (currentUsername != null && !currentUsername.isBlank()) {
            inspector = appUserRepository.findByUserName(currentUsername).orElse(null);
        }

        // Build parent QualityInspection
        QualityInspection inspection = QualityInspection.builder()
                .materialBatch(materialBatch)
                .productionRun(productionRun)
                .finishedBatch(finishedBatch)
                .inspectionType(request.getInspectionType())
                .inspectionDate(OffsetDateTime.now())
                .inspectedBy(inspector)
                .remarks(request.getRemarks())
                .status("Pass") // will be updated based on items
                .build();

        QualityInspection savedInspection = qualityInspectionRepository.save(inspection);

        List<QualityInspectionItem> itemsToSave = new ArrayList<>();
        boolean hasFailure = false;
        boolean hasCriticalFailure = false;

        for (QualityInspectionItemRequest itemReq : request.getItems()) {
            QcSpecification spec = null;
            if (itemReq.getQcSpecificationId() != null) {
                spec = qcSpecificationRepository.findById(itemReq.getQcSpecificationId()).orElse(null);
            }

            var minVal = itemReq.getMinimumValue() != null ? itemReq.getMinimumValue() :
                    (spec != null ? spec.getMinimumValue() : null);
            var maxVal = itemReq.getMaximumValue() != null ? itemReq.getMaximumValue() :
                    (spec != null ? spec.getMaximumValue() : null);
            var targetVal = itemReq.getTargetValue() != null ? itemReq.getTargetValue() :
                    (spec != null ? spec.getTargetValue() : null);
            var unit = itemReq.getMeasurementUnit() != null ? itemReq.getMeasurementUnit() :
                    (spec != null ? spec.getMeasurementUnit() : null);
            var specDesc = itemReq.getSpecification() != null ? itemReq.getSpecification() :
                    (spec != null ? spec.getSpecification() : null);
            boolean isCrit = Boolean.TRUE.equals(itemReq.getIsCritical()) ||
                    (spec != null && Boolean.TRUE.equals(spec.getIsCritical()));

            // Evaluate item result
            String itemResult = "Pass";
            if (minVal != null && itemReq.getObservedValue().compareTo(minVal) < 0) {
                itemResult = "Fail";
            } else if (maxVal != null && itemReq.getObservedValue().compareTo(maxVal) > 0) {
                itemResult = "Fail";
            }

            if ("Fail".equals(itemResult)) {
                hasFailure = true;
                if (isCrit) {
                    hasCriticalFailure = true;
                }
            }

            QualityInspectionItem item = QualityInspectionItem.builder()
                    .inspection(savedInspection)
                    .qcSpecification(spec)
                    .parameterName(itemReq.getParameterName())
                    .minimumValue(minVal)
                    .maximumValue(maxVal)
                    .observedValue(itemReq.getObservedValue())
                    .targetValue(targetVal)
                    .measurementUnit(unit)
                    .specification(specDesc)
                    .result(itemResult)
                    .isCritical(isCrit)
                    .build();

            itemsToSave.add(item);
        }

        List<QualityInspectionItem> savedItems = qualityInspectionItemRepository.saveAll(itemsToSave);

        String overallStatus = hasFailure ? "Fail" : "Pass";
        savedInspection.setStatus(overallStatus);
        qualityInspectionRepository.save(savedInspection);

        // Update batch quality status accordingly
        if ("Pass".equals(overallStatus)) {
            if (finishedBatch != null) {
                finishedBatch.setQualityStatus("Released");
                finishedBatchRepository.save(finishedBatch);
            }
            if (materialBatch != null) {
                materialBatch.setQualityStatus("Available");
                materialBatchRepository.save(materialBatch);
            }
        } else {
            if (finishedBatch != null) {
                finishedBatch.setQualityStatus("Quarantine");
                finishedBatchRepository.save(finishedBatch);
            }
            if (materialBatch != null) {
                materialBatch.setQualityStatus("Quarantine");
                materialBatchRepository.save(materialBatch);
            }

            // Dispatch alert for QC failure
            if (asyncAlertWorker != null) {
                AlertSeverity severity = hasCriticalFailure ? AlertSeverity.CRITICAL : AlertSeverity.HIGH;
                String sourceId = savedInspection.getInspectionId().toString();
                String entityDesc = finishedBatch != null ? "Finished Batch " + finishedBatch.getBatchNo() :
                        (materialBatch != null ? "Material Batch " + materialBatch.getBatchNo() :
                                "Production Run " + (productionRun != null ? productionRun.getProductionNumber() : ""));

                AlertMessage alert = AlertMessage.builder()
                        .correlationId(UUID.randomUUID().toString())
                        .alertType("QC_INSPECTION_FAILED")
                        .severity(severity)
                        .sourceType("QUALITY_INSPECTION")
                        .sourceId(sourceId)
                        .message("QC Inspection FAILED (" + (hasCriticalFailure ? "CRITICAL" : "STANDARD") +
                                ") for " + entityDesc + ". Remarks: " + (request.getRemarks() != null ? request.getRemarks() : "None"))
                        .timestamp(Instant.now())
                        .build();

                asyncAlertWorker.processAlert(alert);
            }
        }

        return mapToResponse(savedInspection, savedItems);
    }

    @Transactional(readOnly = true)
    public QualityInspectionResponse getInspectionById(Long inspectionId) {
        QualityInspection inspection = qualityInspectionRepository.findById(inspectionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Quality Inspection not found with ID: " + inspectionId));
        List<QualityInspectionItem> items = qualityInspectionItemRepository.findByInspection_InspectionId(inspectionId);
        return mapToResponse(inspection, items);
    }

    @Transactional(readOnly = true)
    public List<QualityInspectionResponse> listInspections(String status, String inspectionType) {
        List<QualityInspection> inspections;
        if (status != null && !status.isBlank()) {
            inspections = qualityInspectionRepository.findByStatus(status);
        } else if (inspectionType != null && !inspectionType.isBlank()) {
            inspections = qualityInspectionRepository.findByInspectionType(inspectionType);
        } else {
            inspections = qualityInspectionRepository.findAll();
        }

        return inspections.stream()
                .map(insp -> {
                    List<QualityInspectionItem> items = qualityInspectionItemRepository
                            .findByInspection_InspectionId(insp.getInspectionId());
                    return mapToResponse(insp, items);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<QualityInspectionResponse> getInspectionsByBatch(String type, Long id) {
        List<QualityInspection> list;
        if ("material".equalsIgnoreCase(type)) {
            list = qualityInspectionRepository.findByMaterialBatch_BatchId(id);
        } else if ("run".equalsIgnoreCase(type)) {
            list = qualityInspectionRepository.findByProductionRun_ProductionId(id);
        } else if ("finished".equalsIgnoreCase(type)) {
            list = qualityInspectionRepository.findByFinishedBatch_FinishedBatchId(id);
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid batch type: " + type + ". Must be 'material', 'run', or 'finished'");
        }

        return list.stream()
                .map(insp -> {
                    List<QualityInspectionItem> items = qualityInspectionItemRepository
                            .findByInspection_InspectionId(insp.getInspectionId());
                    return mapToResponse(insp, items);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<QcSpecificationResponse> listSpecifications(Long productId, String inspectionType) {
        List<QcSpecification> specs;
        if (productId != null) {
            specs = qcSpecificationRepository.findByProduct_ProductIdAndIsActiveTrue(productId);
        } else if (inspectionType != null && !inspectionType.isBlank()) {
            specs = qcSpecificationRepository.findByInspectionTypeAndIsActiveTrue(inspectionType);
        } else {
            specs = qcSpecificationRepository.findByIsActiveTrue();
        }

        return specs.stream().map(this::mapSpecToResponse).toList();
    }

    private QualityInspectionResponse mapToResponse(QualityInspection inspection, List<QualityInspectionItem> items) {
        List<QualityInspectionItemResponse> itemResponses = items.stream()
                .map(i -> QualityInspectionItemResponse.builder()
                        .qiId(i.getQiId())
                        .qcSpecificationId(i.getQcSpecification() != null ? i.getQcSpecification().getQcSpecificationId() : null)
                        .parameterName(i.getParameterName())
                        .minimumValue(i.getMinimumValue())
                        .maximumValue(i.getMaximumValue())
                        .observedValue(i.getObservedValue())
                        .targetValue(i.getTargetValue())
                        .measurementUnit(i.getMeasurementUnit())
                        .specification(i.getSpecification())
                        .result(i.getResult())
                        .isCritical(i.getIsCritical())
                        .build())
                .toList();

        return QualityInspectionResponse.builder()
                .inspectionId(inspection.getInspectionId())
                .materialBatchId(inspection.getMaterialBatch() != null ? inspection.getMaterialBatch().getBatchId() : null)
                .materialBatchNo(inspection.getMaterialBatch() != null ? inspection.getMaterialBatch().getBatchNo() : null)
                .productionRunId(inspection.getProductionRun() != null ? inspection.getProductionRun().getProductionId() : null)
                .productionRunNumber(inspection.getProductionRun() != null ? inspection.getProductionRun().getProductionNumber() : null)
                .finishedBatchId(inspection.getFinishedBatch() != null ? inspection.getFinishedBatch().getFinishedBatchId() : null)
                .finishedBatchNo(inspection.getFinishedBatch() != null ? inspection.getFinishedBatch().getBatchNo() : null)
                .inspectionType(inspection.getInspectionType())
                .inspectionDate(inspection.getInspectionDate())
                .inspectedByUserName(inspection.getInspectedBy() != null ? inspection.getInspectedBy().getUserName() : null)
                .status(inspection.getStatus())
                .remarks(inspection.getRemarks())
                .items(itemResponses)
                .build();
    }

    private QcSpecificationResponse mapSpecToResponse(QcSpecification s) {
        return QcSpecificationResponse.builder()
                .qcSpecificationId(s.getQcSpecificationId())
                .productId(s.getProduct() != null ? s.getProduct().getProductId() : null)
                .productCode(s.getProduct() != null ? s.getProduct().getProductCode() : null)
                .productName(s.getProduct() != null ? s.getProduct().getProductName() : null)
                .inspectionType(s.getInspectionType())
                .parameterName(s.getParameterName())
                .minimumValue(s.getMinimumValue())
                .maximumValue(s.getMaximumValue())
                .targetValue(s.getTargetValue())
                .measurementUnit(s.getMeasurementUnit())
                .specification(s.getSpecification())
                .isCritical(s.getIsCritical())
                .isActive(s.getIsActive())
                .build();
    }
}

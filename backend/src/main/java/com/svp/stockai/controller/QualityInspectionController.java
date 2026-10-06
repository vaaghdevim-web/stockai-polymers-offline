package com.svp.stockai.controller;

import com.svp.stockai.dto.CreateQcSpecificationRequest;
import com.svp.stockai.dto.QcSpecificationResponse;
import com.svp.stockai.dto.QualityInspectionRequest;
import com.svp.stockai.dto.QualityInspectionResponse;
import com.svp.stockai.service.QualityInspectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/qc")
@RequiredArgsConstructor
public class QualityInspectionController {

    private final QualityInspectionService qualityInspectionService;

    @PostMapping("/inspections")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public QualityInspectionResponse recordInspection(
            @Valid @RequestBody QualityInspectionRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        return qualityInspectionService.recordInspection(request, username);
    }

    @GetMapping("/inspections/{id}")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public QualityInspectionResponse getInspectionById(@PathVariable Long id) {
        return qualityInspectionService.getInspectionById(id);
    }

    @GetMapping("/inspections")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public List<QualityInspectionResponse> listInspections(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String inspectionType) {
        return qualityInspectionService.listInspections(status, inspectionType);
    }

    @GetMapping("/inspections/batch/{type}/{id}")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public List<QualityInspectionResponse> getInspectionsByBatch(
            @PathVariable String type,
            @PathVariable Long id) {
        return qualityInspectionService.getInspectionsByBatch(type, id);
    }

    @GetMapping("/specifications")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public List<QcSpecificationResponse> listSpecifications(
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) String inspectionType) {
        return qualityInspectionService.listSpecifications(productId, inspectionType);
    }

    @PostMapping("/specifications")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN', 'MANAGER')")
    public QcSpecificationResponse createSpecification(@Valid @RequestBody CreateQcSpecificationRequest request) {
        return qualityInspectionService.createSpecification(request);
    }

    @PutMapping("/specifications/{id}")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN', 'MANAGER')")
    public QcSpecificationResponse updateSpecification(
            @PathVariable Long id,
            @Valid @RequestBody CreateQcSpecificationRequest request) {
        return qualityInspectionService.updateSpecification(id, request);
    }

    @DeleteMapping("/specifications/{id}")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN', 'MANAGER')")
    public Map<String, Object> deleteSpecification(@PathVariable Long id) {
        qualityInspectionService.deleteSpecification(id);
        return Map.of(
                "success", true,
                "message", "QC Specification parameter ID " + id + " deactivated successfully.",
                "specificationId", id
        );
    }
}

package com.svp.stockai.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QualityInspectionRequest {

    @NotBlank(message = "Inspection type is required ('Incoming', 'InProcess', 'Final')")
    private String inspectionType;

    private Long materialBatchId;

    private Long productionRunId;

    private Long finishedBatchId;

    private String remarks;

    @NotEmpty(message = "At least one inspection test item must be provided")
    @Valid
    private List<QualityInspectionItemRequest> items;
}

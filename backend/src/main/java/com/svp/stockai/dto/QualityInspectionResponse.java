package com.svp.stockai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QualityInspectionResponse {

    private Long inspectionId;
    private Long materialBatchId;
    private String materialBatchNo;
    private Long productionRunId;
    private String productionRunNumber;
    private Long finishedBatchId;
    private String finishedBatchNo;
    private String inspectionType;
    private OffsetDateTime inspectionDate;
    private String inspectedByUserName;
    private String status;
    private String remarks;
    private List<QualityInspectionItemResponse> items;
}

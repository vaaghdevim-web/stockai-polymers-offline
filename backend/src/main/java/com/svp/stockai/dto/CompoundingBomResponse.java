package com.svp.stockai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompoundingBomResponse {

    private Long compoundingBomId;
    private String bomCode;
    private String version;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private BigDecimal targetBatchWeightKg;
    private String status;
    private String createdByUserName;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private List<CompoundingBomItemResponse> items;
}

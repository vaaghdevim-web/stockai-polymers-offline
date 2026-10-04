package com.svp.stockai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchRequirementCalculationResponse {

    private Long compoundingBomId;
    private String bomCode;
    private String version;
    private BigDecimal desiredBatchWeightKg;
    private List<CalculatedItemRequirement> calculatedRequirements;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CalculatedItemRequirement {
        private Long materialId;
        private String materialCode;
        private String materialName;
        private String categoryName;
        private BigDecimal percentage;
        private BigDecimal requiredQuantityKg;
        private Boolean isRequired;
    }
}

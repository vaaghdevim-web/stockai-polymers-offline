package com.svp.stockai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QualityInspectionItemResponse {

    private Long qiId;
    private Long qcSpecificationId;
    private String parameterName;
    private BigDecimal minimumValue;
    private BigDecimal maximumValue;
    private BigDecimal observedValue;
    private BigDecimal targetValue;
    private String measurementUnit;
    private String specification;
    private String result;
    private Boolean isCritical;
}

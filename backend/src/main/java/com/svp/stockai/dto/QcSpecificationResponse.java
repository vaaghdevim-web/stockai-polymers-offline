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
public class QcSpecificationResponse {

    private Long qcSpecificationId;
    private Long productId;
    private String productCode;
    private String productName;
    private String inspectionType;
    private String parameterName;
    private BigDecimal minimumValue;
    private BigDecimal maximumValue;
    private BigDecimal targetValue;
    private String measurementUnit;
    private String specification;
    private Boolean isCritical;
    private Boolean isActive;
}

package com.svp.stockai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QualityInspectionItemRequest {

    private Long qcSpecificationId;

    @NotBlank(message = "Parameter name is required")
    private String parameterName;

    private BigDecimal minimumValue;

    private BigDecimal maximumValue;

    @NotNull(message = "Observed value is required")
    private BigDecimal observedValue;

    private BigDecimal targetValue;

    private String measurementUnit;

    private String specification;

    private Boolean isCritical;
}

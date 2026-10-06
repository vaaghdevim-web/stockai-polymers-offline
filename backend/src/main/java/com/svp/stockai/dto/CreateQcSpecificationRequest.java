package com.svp.stockai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateQcSpecificationRequest {

    private Long productId;

    @NotBlank(message = "Inspection type is required ('Incoming', 'InProcess', or 'Final')")
    private String inspectionType;

    @NotBlank(message = "Parameter name is required")
    private String parameterName;

    private BigDecimal minimumValue;

    private BigDecimal maximumValue;

    private BigDecimal targetValue;

    private String measurementUnit;

    private String specification;

    private Boolean isCritical;

    private Boolean isActive;
}

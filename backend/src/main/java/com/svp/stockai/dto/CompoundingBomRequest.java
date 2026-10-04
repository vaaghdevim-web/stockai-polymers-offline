package com.svp.stockai.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompoundingBomRequest {

    @NotBlank(message = "BOM Code cannot be blank")
    private String bomCode;

    @NotBlank(message = "Version cannot be blank")
    private String version;

    private LocalDate effectiveFrom;

    private LocalDate effectiveTo;

    @NotNull(message = "Target batch weight in KG is required")
    @DecimalMin(value = "0.0001", message = "Target batch weight must be greater than 0")
    private BigDecimal targetBatchWeightKg;

    @NotEmpty(message = "Compounding BOM must contain at least one recipe item")
    @Valid
    private List<CompoundingBomItemRequest> items;
}

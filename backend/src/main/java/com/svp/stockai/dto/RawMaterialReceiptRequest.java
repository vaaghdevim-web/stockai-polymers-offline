package com.svp.stockai.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record RawMaterialReceiptRequest(
        @NotNull Long materialId,
        Long supplierId,
        @NotNull Long binId,
        @NotBlank String batchNo,
        String lotNumber,
        LocalDate expiryDate,
        @NotNull @DecimalMin(value = "0.0001") BigDecimal quantityKg,
        @NotNull @DecimalMin("0.0") BigDecimal unitCost,
        OffsetDateTime receivedAt,
        String qualityStatus) {
}

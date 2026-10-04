package com.svp.stockai.dto;

import java.math.BigDecimal;

public record RawMaterialResponse(
        Long materialId,
        String materialName,
        String materialCode,
        Long categoryId,
        String categoryName,
        Long defaultUomId,
        String defaultUomCode,
        BigDecimal standardCost,
        BigDecimal reorderLevel,
        BigDecimal safetyStock,
        Integer leadTimeDays,
        Boolean active) {
}

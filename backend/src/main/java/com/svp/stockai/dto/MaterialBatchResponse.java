package com.svp.stockai.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record MaterialBatchResponse(Long batchId, String batchNo, String lotNumber,
                                    BigDecimal availableWeightKg, OffsetDateTime receivedAt) {
}

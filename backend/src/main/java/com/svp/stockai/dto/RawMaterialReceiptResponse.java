package com.svp.stockai.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record RawMaterialReceiptResponse(Long batchId, Long inventoryId, Long transactionId,
                                         String batchNo, BigDecimal quantityKg,
                                         OffsetDateTime receivedAt, String qualityStatus) {
}

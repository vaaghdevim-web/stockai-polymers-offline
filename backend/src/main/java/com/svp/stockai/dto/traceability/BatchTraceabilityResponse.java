package com.svp.stockai.dto.traceability;

import java.util.List;
import java.util.Map;

public record BatchTraceabilityResponse(
        String targetIdentifier,
        String traceabilityDirection, // "FORWARD", "BACKWARD", "BIDIRECTIONAL"
        boolean found,
        String itemType, // "RAW_MATERIAL", "COMPOUNDING_BATCH", "FINISHED_PRODUCT"
        String itemName,
        TraceabilityNode rootNode,
        List<Map<String, Object>> relatedInspections,
        String narrativeSummary
) {
}

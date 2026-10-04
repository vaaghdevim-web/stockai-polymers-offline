package com.svp.stockai.dto.traceability;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record TraceabilityNode(
        String nodeType,
        String identifier,
        String name,
        String status,
        BigDecimal quantity,
        String uom,
        String timestamp,
        Map<String, Object> details,
        List<TraceabilityNode> children
) {
}

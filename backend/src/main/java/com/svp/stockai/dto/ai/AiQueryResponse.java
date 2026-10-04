package com.svp.stockai.dto.ai;

import java.util.List;
import java.util.Map;

public record AiQueryResponse(
        String query,
        String intent,
        double confidence,
        String answer,
        List<Map<String, Object>> structuredData,
        List<String> suggestedActions
) {
}

package com.svp.stockai.dto.ai;

import java.util.Map;

public record AiQueryRequest(
        String query,
        String context,
        Map<String, Object> filters
) {
}

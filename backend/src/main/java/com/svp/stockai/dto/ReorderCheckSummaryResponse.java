package com.svp.stockai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReorderCheckSummaryResponse {

    private int totalMaterialsEvaluated;
    private int lowStockCount;
    private int criticalStockCount;
    private int newRecommendationsCreated;
    private Instant scanTimestamp;
    private List<PurchaseRecommendationResponse> generatedRecommendations;
}

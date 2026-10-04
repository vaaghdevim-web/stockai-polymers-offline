package com.svp.stockai.service;

import com.svp.stockai.dto.FinishedGoodsMetricsResponse;
import com.svp.stockai.entity.ProductionOutput;
import com.svp.stockai.entity.ProductionRun;
import com.svp.stockai.repository.ProductionOutputRepository;
import com.svp.stockai.repository.ProductionRunRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class FinishedGoodsMetricsService {

    private final ProductionRunRepository productionRunRepository;
    private final ProductionOutputRepository productionOutputRepository;

    public FinishedGoodsMetricsResponse getMetrics(Long productionId) {

        ProductionRun productionRun =
                productionRunRepository.findById(productionId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Production run " + productionId + " was not found"
                                ));

        BigDecimal inputWeight =
                productionRun.getInputWeightKg() != null
                        ? productionRun.getInputWeightKg()
                        : BigDecimal.ZERO;

        BigDecimal outputWeight = productionRun.getOutputWeightKg();
        Integer bagsProduced = null;

        if (productionRun.getBagsProduced() != null && productionRun.getBagsProduced().compareTo(BigDecimal.ZERO) > 0) {
            bagsProduced = productionRun.getBagsProduced().intValue();
        }

        // Check output records from production_output if run weights/bags are missing
        List<ProductionOutput> outputs =
                productionOutputRepository.findByProductionRun_ProductionId(productionId);

        if (outputWeight == null || outputWeight.compareTo(BigDecimal.ZERO) == 0) {
            if (outputs != null && !outputs.isEmpty()) {
                BigDecimal totalOutputWeight = outputs.stream()
                        .map(ProductionOutput::getOutputWeightKg)
                        .filter(Objects::nonNull)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                if (totalOutputWeight.compareTo(BigDecimal.ZERO) > 0) {
                    outputWeight = totalOutputWeight;
                } else {
                    outputWeight = BigDecimal.ZERO;
                }
            } else {
                outputWeight = BigDecimal.ZERO;
            }
        }

        if (bagsProduced == null || bagsProduced <= 0) {
            if (outputs != null && !outputs.isEmpty()) {
                BigDecimal totalBags = outputs.stream()
                        .map(o -> o.getOutputBags() != null ? o.getOutputBags() : o.getProducedQty())
                        .filter(Objects::nonNull)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                bagsProduced = totalBags.intValue();
            } else if (productionRun.getBagsProduced() != null) {
                bagsProduced = productionRun.getBagsProduced().intValue();
            } else {
                bagsProduced = 0;
            }
        }

        // Scrap weight calculation: use explicit scrap weight if present; otherwise deduce from mass balance if input > output
        BigDecimal scrapWeight = productionRun.getScrapWeightKg();
        if (scrapWeight == null) {
            if (inputWeight.compareTo(outputWeight) > 0) {
                scrapWeight = inputWeight.subtract(outputWeight);
            } else {
                scrapWeight = BigDecimal.ZERO;
            }
        }

        BigDecimal yieldPercentage =
                calculatePercentage(outputWeight, inputWeight);

        BigDecimal scrapPercentage =
                calculatePercentage(scrapWeight, inputWeight);

        BigDecimal averageBagWeightG = BigDecimal.ZERO;
        BigDecimal bagsPerKg = BigDecimal.ZERO;

        if (bagsProduced != null
                && bagsProduced > 0
                && outputWeight != null
                && outputWeight.compareTo(BigDecimal.ZERO) > 0) {

            averageBagWeightG =
                    outputWeight
                            .multiply(BigDecimal.valueOf(1000))
                            .divide(
                                    BigDecimal.valueOf(bagsProduced),
                                    2,
                                    RoundingMode.HALF_UP
                            );

            bagsPerKg =
                    BigDecimal.valueOf(bagsProduced)
                            .divide(
                                    outputWeight,
                                    2,
                                    RoundingMode.HALF_UP
                            );
        }

        return FinishedGoodsMetricsResponse.builder()
                .productionId(productionRun.getProductionId())
                .inputWeightKg(inputWeight)
                .outputWeightKg(outputWeight)
                .scrapWeightKg(scrapWeight)
                .yieldPercentage(yieldPercentage)
                .scrapPercentage(scrapPercentage)
                .bagsProduced(bagsProduced)
                .averageBagWeightG(averageBagWeightG)
                .bagsPerKg(bagsPerKg)
                .build();
    }

    private BigDecimal calculatePercentage(
            BigDecimal value,
            BigDecimal total) {

        if (value == null
                || total == null
                || total.compareTo(BigDecimal.ZERO) <= 0
                || value.compareTo(BigDecimal.ZERO) <= 0) {

            return BigDecimal.ZERO;
        }

        return value
                .multiply(BigDecimal.valueOf(100))
                .divide(
                        total,
                        2,
                        RoundingMode.HALF_UP
                );
    }
}
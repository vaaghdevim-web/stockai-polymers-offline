package com.svp.stockai.service;

import com.svp.stockai.dto.FinishedGoodsMetricsResponse;
import com.svp.stockai.entity.ProductionOutput;
import com.svp.stockai.entity.ProductionRun;
import com.svp.stockai.repository.ProductionOutputRepository;
import com.svp.stockai.repository.ProductionRunRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FinishedGoodsMetricsServiceTest {

    @Mock
    private ProductionRunRepository productionRunRepository;

    @Mock
    private ProductionOutputRepository productionOutputRepository;

    @InjectMocks
    private FinishedGoodsMetricsService finishedGoodsMetricsService;

    @Test
    void getMetrics_successfulCalculationWithAllFieldsPresent() {
        Long productionId = 100L;
        ProductionRun run = ProductionRun.builder()
                .productionId(productionId)
                .inputWeightKg(new BigDecimal("1000.0000"))
                .outputWeightKg(new BigDecimal("950.0000"))
                .scrapWeightKg(new BigDecimal("50.0000"))
                .bagsProduced(new BigDecimal("1900"))
                .build();

        when(productionRunRepository.findById(productionId)).thenReturn(Optional.of(run));
        when(productionOutputRepository.findByProductionRun_ProductionId(productionId)).thenReturn(Collections.emptyList());

        FinishedGoodsMetricsResponse response = finishedGoodsMetricsService.getMetrics(productionId);

        assertNotNull(response);
        assertEquals(productionId, response.getProductionId());
        assertEquals(new BigDecimal("1000.0000"), response.getInputWeightKg());
        assertEquals(new BigDecimal("950.0000"), response.getOutputWeightKg());
        assertEquals(new BigDecimal("50.0000"), response.getScrapWeightKg());
        // Yield = 950 * 100 / 1000 = 95.00
        assertEquals(new BigDecimal("95.00"), response.getYieldPercentage());
        // Scrap = 50 * 100 / 1000 = 5.00
        assertEquals(new BigDecimal("5.00"), response.getScrapPercentage());
        assertEquals(1900, response.getBagsProduced());
        // Avg bag weight = 950 * 1000 / 1900 = 500.00 g
        assertEquals(new BigDecimal("500.00"), response.getAverageBagWeightG());
        // Bags per kg = 1900 / 950 = 2.00
        assertEquals(new BigDecimal("2.00"), response.getBagsPerKg());
    }

    @Test
    void getMetrics_throwsNotFoundWhenProductionRunDoesNotExist() {
        Long unknownId = 999L;
        when(productionRunRepository.findById(unknownId)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> finishedGoodsMetricsService.getMetrics(unknownId)
        );

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertTrue(ex.getReason().contains("999 was not found"));
    }

    @Test
    void getMetrics_handlesMissingOutputRecordsSafely() {
        Long productionId = 200L;
        ProductionRun run = ProductionRun.builder()
                .productionId(productionId)
                .inputWeightKg(new BigDecimal("500.0000"))
                .outputWeightKg(null)
                .scrapWeightKg(null)
                .bagsProduced(null)
                .build();

        when(productionRunRepository.findById(productionId)).thenReturn(Optional.of(run));
        when(productionOutputRepository.findByProductionRun_ProductionId(productionId)).thenReturn(Collections.emptyList());

        FinishedGoodsMetricsResponse response = finishedGoodsMetricsService.getMetrics(productionId);

        assertNotNull(response);
        assertEquals(new BigDecimal("500.0000"), response.getInputWeightKg());
        assertEquals(BigDecimal.ZERO, response.getOutputWeightKg());
        assertEquals(new BigDecimal("500.0000"), response.getScrapWeightKg()); // input - output (500 - 0 = 500)
        assertEquals(BigDecimal.ZERO, response.getYieldPercentage());
        assertEquals(new BigDecimal("100.00"), response.getScrapPercentage());
        assertEquals(0, response.getBagsProduced());
        assertEquals(BigDecimal.ZERO, response.getAverageBagWeightG());
        assertEquals(BigDecimal.ZERO, response.getBagsPerKg());
    }

    @Test
    void getMetrics_aggregatesFromProductionOutputWhenRunOutputsAreZero() {
        Long productionId = 300L;
        ProductionRun run = ProductionRun.builder()
                .productionId(productionId)
                .inputWeightKg(new BigDecimal("2000.0000"))
                .outputWeightKg(BigDecimal.ZERO)
                .scrapWeightKg(new BigDecimal("100.0000"))
                .bagsProduced(null)
                .build();

        ProductionOutput output1 = ProductionOutput.builder()
                .outputWeightKg(new BigDecimal("900.0000"))
                .outputBags(new BigDecimal("1800"))
                .build();
        ProductionOutput output2 = ProductionOutput.builder()
                .outputWeightKg(new BigDecimal("1000.0000"))
                .outputBags(new BigDecimal("2000"))
                .build();

        when(productionRunRepository.findById(productionId)).thenReturn(Optional.of(run));
        when(productionOutputRepository.findByProductionRun_ProductionId(productionId))
                .thenReturn(List.of(output1, output2));

        FinishedGoodsMetricsResponse response = finishedGoodsMetricsService.getMetrics(productionId);

        assertNotNull(response);
        // Total output = 900 + 1000 = 1900.0000
        assertEquals(new BigDecimal("1900.0000"), response.getOutputWeightKg());
        // Total bags = 1800 + 2000 = 3800
        assertEquals(3800, response.getBagsProduced());
        // Yield = 1900 * 100 / 2000 = 95.00
        assertEquals(new BigDecimal("95.00"), response.getYieldPercentage());
        // Scrap = 100 * 100 / 2000 = 5.00
        assertEquals(new BigDecimal("5.00"), response.getScrapPercentage());
        // Avg bag weight = 1900 * 1000 / 3800 = 500.00
        assertEquals(new BigDecimal("500.00"), response.getAverageBagWeightG());
        // Bags per kg = 3800 / 1900 = 2.00
        assertEquals(new BigDecimal("2.00"), response.getBagsPerKg());
    }

    @Test
    void getMetrics_handlesZeroInputDivisionSafely() {
        Long productionId = 400L;
        ProductionRun run = ProductionRun.builder()
                .productionId(productionId)
                .inputWeightKg(BigDecimal.ZERO)
                .outputWeightKg(BigDecimal.ZERO)
                .scrapWeightKg(BigDecimal.ZERO)
                .bagsProduced(BigDecimal.ZERO)
                .build();

        when(productionRunRepository.findById(productionId)).thenReturn(Optional.of(run));
        when(productionOutputRepository.findByProductionRun_ProductionId(productionId)).thenReturn(Collections.emptyList());

        FinishedGoodsMetricsResponse response = finishedGoodsMetricsService.getMetrics(productionId);

        assertNotNull(response);
        assertEquals(BigDecimal.ZERO, response.getInputWeightKg());
        assertEquals(BigDecimal.ZERO, response.getOutputWeightKg());
        assertEquals(BigDecimal.ZERO, response.getScrapWeightKg());
        assertEquals(BigDecimal.ZERO, response.getYieldPercentage());
        assertEquals(BigDecimal.ZERO, response.getScrapPercentage());
        assertEquals(0, response.getBagsProduced());
        assertEquals(BigDecimal.ZERO, response.getAverageBagWeightG());
        assertEquals(BigDecimal.ZERO, response.getBagsPerKg());
    }

    @Test
    void getMetrics_handlesAllNullValuesSafely() {
        Long productionId = 500L;
        ProductionRun run = ProductionRun.builder()
                .productionId(productionId)
                .inputWeightKg(null)
                .outputWeightKg(null)
                .scrapWeightKg(null)
                .bagsProduced(null)
                .build();

        when(productionRunRepository.findById(productionId)).thenReturn(Optional.of(run));
        when(productionOutputRepository.findByProductionRun_ProductionId(productionId)).thenReturn(null);

        FinishedGoodsMetricsResponse response = finishedGoodsMetricsService.getMetrics(productionId);

        assertNotNull(response);
        assertEquals(BigDecimal.ZERO, response.getInputWeightKg());
        assertEquals(BigDecimal.ZERO, response.getOutputWeightKg());
        assertEquals(BigDecimal.ZERO, response.getScrapWeightKg());
        assertEquals(BigDecimal.ZERO, response.getYieldPercentage());
        assertEquals(BigDecimal.ZERO, response.getScrapPercentage());
        assertEquals(0, response.getBagsProduced());
        assertEquals(BigDecimal.ZERO, response.getAverageBagWeightG());
        assertEquals(BigDecimal.ZERO, response.getBagsPerKg());
    }
}


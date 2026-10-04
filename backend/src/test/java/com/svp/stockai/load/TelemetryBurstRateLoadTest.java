package com.svp.stockai.load;

import com.svp.stockai.dto.ActiveMachineResponse;
import com.svp.stockai.dto.TelemetryBurstRequest;
import com.svp.stockai.dto.TelemetryIngestResponse;
import com.svp.stockai.dto.TelemetryPacketRequest;
import com.svp.stockai.entity.Machine;
import com.svp.stockai.entity.ProductionUnit;
import com.svp.stockai.repository.MachineRepository;
import com.svp.stockai.service.IoTTelemetryIngestionService;
import com.svp.stockai.service.IoTTelemetryStreamingService;
import com.svp.stockai.service.MachineCacheService;
import com.svp.stockai.service.TelemetryAnomalyEvaluator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Engineer 2 Week 4 - 1,000 req/sec Telemetry Burst Rate Benchmark Suite")
class TelemetryBurstRateLoadTest {

    @Mock
    private MachineRepository machineRepository;

    private TelemetryAnomalyEvaluator anomalyEvaluator;
    private IoTTelemetryStreamingService streamingService;
    private IoTTelemetryIngestionService ingestionService;
    private MachineCacheService machineCacheService;

    @BeforeEach
    void setUp() {
        anomalyEvaluator = new TelemetryAnomalyEvaluator();
        streamingService = new IoTTelemetryStreamingService();
        ingestionService = new IoTTelemetryIngestionService(anomalyEvaluator, streamingService);
        machineCacheService = new MachineCacheService(machineRepository);
    }

    @Test
    @DisplayName("Load Benchmark: Simulate 2,000 concurrent single telemetry packets at >= 1,000 req/sec")
    void testConcurrentTelemetryPacketIngestionBurstRate() throws InterruptedException, ExecutionException {
        final int TOTAL_REQUESTS = 2000;
        final int THREAD_COUNT = 40;
        ExecutorService executor = Executors.newFixedThreadPool(THREAD_COUNT);
        CountDownLatch readyLatch = new CountDownLatch(THREAD_COUNT);
        CountDownLatch startLatch = new CountDownLatch(1);

        List<Future<Long>> futures = new ArrayList<>(TOTAL_REQUESTS);
        AtomicInteger successCounter = new AtomicInteger(0);
        AtomicInteger errorCounter = new AtomicInteger(0);

        String[] machineCodes = {"MCH-EXT-01", "MCH-EXT-02", "MCH-WEAV-01", "MCH-WEAV-02", "MCH-CONV-01", "MCH-CONV-02"};

        for (int i = 0; i < TOTAL_REQUESTS; i++) {
            final int index = i;
            futures.add(executor.submit(() -> {
                readyLatch.countDown();
                startLatch.await(); // Synchronize all worker threads to fire concurrently

                long reqStart = System.nanoTime();
                try {
                    String mch = machineCodes[index % machineCodes.length];
                    TelemetryPacketRequest packet = TelemetryPacketRequest.builder()
                            .machineCode(mch)
                            .plantId(1L)
                            .unit("Unit 1")
                            .machineType("Extruder")
                            .zone1Temp(new BigDecimal("210.50"))
                            .zone2Temp(new BigDecimal("215.00"))
                            .meltPressureBar(new BigDecimal("145.00"))
                            .lineSpeedMpm(new BigDecimal("350.00"))
                            .machineStatus("RUNNING")
                            .packetTimestamp(Instant.now())
                            .build();

                    TelemetryIngestResponse response = ingestionService.ingestPacket(packet);
                    if (response != null && "ACCEPTED".equals(response.getStatus())) {
                        successCounter.incrementAndGet();
                    } else {
                        errorCounter.incrementAndGet();
                    }
                } catch (Exception ex) {
                    errorCounter.incrementAndGet();
                }
                return System.nanoTime() - reqStart;
            }));
        }

        readyLatch.await(5, TimeUnit.SECONDS);
        long burstStartTime = System.currentTimeMillis();
        startLatch.countDown(); // Release threads simultaneously

        List<Long> latenciesNs = new ArrayList<>();
        for (Future<Long> future : futures) {
            latenciesNs.add(future.get());
        }
        long totalElapsedMs = Math.max(1, System.currentTimeMillis() - burstStartTime);
        executor.shutdown();
        executor.awaitTermination(10, TimeUnit.SECONDS);

        // Throughput calculation: req/sec = (TOTAL_REQUESTS * 1000) / totalElapsedMs
        double throughputReqPerSec = ((double) TOTAL_REQUESTS / totalElapsedMs) * 1000.0;

        // Latency percentiles in milliseconds
        Collections.sort(latenciesNs);
        double p50Ms = latenciesNs.get((int) (latenciesNs.size() * 0.50)) / 1_000_000.0;
        double p95Ms = latenciesNs.get((int) (latenciesNs.size() * 0.95)) / 1_000_000.0;
        double p99Ms = latenciesNs.get((int) (latenciesNs.size() * 0.99)) / 1_000_000.0;

        System.out.println("=== TELEMETRY BURST LOAD BENCHMARK RESULTS ===");
        System.out.printf("Total Requests Processed : %d%n", TOTAL_REQUESTS);
        System.out.printf("Successful Requests      : %d%n", successCounter.get());
        System.out.printf("Failed Requests          : %d%n", errorCounter.get());
        System.out.printf("Total Elapsed Time       : %d ms%n", totalElapsedMs);
        System.out.printf("Throughput               : %.2f req/sec%n", throughputReqPerSec);
        System.out.printf("Latency p50 / p95 / p99  : %.3f ms / %.3f ms / %.3f ms%n", p50Ms, p95Ms, p99Ms);
        System.out.println("===============================================");

        assertThat(successCounter.get()).isEqualTo(TOTAL_REQUESTS);
        assertThat(errorCounter.get()).isZero();
        assertThat(throughputReqPerSec).isGreaterThanOrEqualTo(1000.0);
        assertThat(p95Ms).isLessThan(25.0); // SLA target: p95 < 25ms
    }

    @Test
    @DisplayName("Load Benchmark: High-volume telemetry burst batch processing (100 batches x 20 packets = 2,000 packets)")
    void testConcurrentTelemetryBurstBatchIngestion() throws InterruptedException, ExecutionException {
        final int TOTAL_BATCHES = 100;
        final int PACKETS_PER_BATCH = 20;
        final int THREAD_COUNT = 20;

        ExecutorService executor = Executors.newFixedThreadPool(THREAD_COUNT);
        List<Future<TelemetryIngestResponse>> futures = new ArrayList<>();

        long startTime = System.currentTimeMillis();

        for (int i = 0; i < TOTAL_BATCHES; i++) {
            final int batchId = i;
            futures.add(executor.submit(() -> {
                List<TelemetryPacketRequest> packets = new ArrayList<>();
                for (int j = 0; j < PACKETS_PER_BATCH; j++) {
                    packets.add(TelemetryPacketRequest.builder()
                            .machineCode("MCH-BATCH-" + (j % 5))
                            .plantId(1L)
                            .unit("Unit 1")
                            .machineType("Extruder")
                            .zone1Temp(new BigDecimal("215.00"))
                            .meltPressureBar(new BigDecimal("140.00"))
                            .lineSpeedMpm(new BigDecimal("360.00"))
                            .machineStatus("RUNNING")
                            .packetTimestamp(Instant.now())
                            .build());
                }
                TelemetryBurstRequest burstRequest = TelemetryBurstRequest.builder()
                        .gatewayId("EDGE-GATEWAY-" + (batchId % 4))
                        .packets(packets)
                        .batchTimestamp(Instant.now())
                        .build();

                return ingestionService.ingestBurst(burstRequest);
            }));
        }

        int totalPacketsAccepted = 0;
        for (Future<TelemetryIngestResponse> f : futures) {
            TelemetryIngestResponse res = f.get();
            assertThat(res.getStatus()).isEqualTo("ACCEPTED");
            totalPacketsAccepted += res.getAcceptedCount();
        }

        long elapsedMs = Math.max(1, System.currentTimeMillis() - startTime);
        executor.shutdown();
        executor.awaitTermination(5, TimeUnit.SECONDS);

        double packetThroughput = ((double) (TOTAL_BATCHES * PACKETS_PER_BATCH) / elapsedMs) * 1000.0;

        System.out.printf("Burst Batch Processed: %d packets in %d ms (%.2f packets/sec)%n",
                totalPacketsAccepted, elapsedMs, packetThroughput);

        assertThat(totalPacketsAccepted).isEqualTo(TOTAL_BATCHES * PACKETS_PER_BATCH);
        assertThat(packetThroughput).isGreaterThanOrEqualTo(1000.0);
    }

    @Test
    @DisplayName("Load Benchmark: High-concurrency cached active machine queries (1,000 reads under load)")
    void testConcurrentActiveMachineCacheQueries() throws InterruptedException, ExecutionException {
        ProductionUnit unit = ProductionUnit.builder().unitId(1L).unitName("Unit 1").unitCode("U1").build();
        Machine machine1 = Machine.builder().machineId(1L).machineCode("MCH-01").machineName("Extruder 1").status("Running").isActive(true).unit(unit).build();
        Machine machine2 = Machine.builder().machineId(2L).machineCode("MCH-02").machineName("Loom 1").status("Available").isActive(true).unit(unit).build();

        when(machineRepository.findByIsActiveTrueAndStatusIn(any())).thenReturn(Arrays.asList(machine1, machine2));

        final int TOTAL_READS = 1000;
        final int THREAD_COUNT = 30;
        ExecutorService executor = Executors.newFixedThreadPool(THREAD_COUNT);
        List<Future<List<ActiveMachineResponse>>> futures = new ArrayList<>();

        long startTime = System.currentTimeMillis();

        for (int i = 0; i < TOTAL_READS; i++) {
            futures.add(executor.submit(() -> machineCacheService.activeMachines()));
        }

        for (Future<List<ActiveMachineResponse>> f : futures) {
            List<ActiveMachineResponse> res = f.get();
            assertThat(res).hasSize(2);
        }

        long elapsedMs = Math.max(1, System.currentTimeMillis() - startTime);
        executor.shutdown();
        executor.awaitTermination(5, TimeUnit.SECONDS);

        double readThroughput = ((double) TOTAL_READS / elapsedMs) * 1000.0;
        System.out.printf("Concurrent Cache Reads: %d queries in %d ms (%.2f ops/sec)%n",
                TOTAL_READS, elapsedMs, readThroughput);

        assertThat(readThroughput).isGreaterThanOrEqualTo(1000.0);
    }
}

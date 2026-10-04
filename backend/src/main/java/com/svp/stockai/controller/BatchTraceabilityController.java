package com.svp.stockai.controller;

import com.svp.stockai.dto.traceability.BatchTraceabilityResponse;
import com.svp.stockai.service.BatchTraceabilityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/traceability")
@RequiredArgsConstructor
@Tag(name = "Batch Traceability Engine", description = "End-to-end forward and backward batch, lot, and compounding genealogy")
public class BatchTraceabilityController {

    private final BatchTraceabilityService batchTraceabilityService;

    @GetMapping("/backward/{finishedBatchCode}")
    @Operation(summary = "Backward Traceability", description = "Trace a finished product batch backward to its compounding formulation, extrusion run, and supplier raw material lots")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR')")
    public ResponseEntity<BatchTraceabilityResponse> getBackwardTraceability(
            @PathVariable String finishedBatchCode) {
        return ResponseEntity.ok(batchTraceabilityService.getBackwardTraceability(finishedBatchCode));
    }

    @GetMapping("/forward/{rawLotOrBatchNo}")
    @Operation(summary = "Forward Traceability", description = "Trace a supplier raw material lot forward through compounding batches, extrusion, weaving, finished goods, and customer shipments")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR')")
    public ResponseEntity<BatchTraceabilityResponse> getForwardTraceability(
            @PathVariable String rawLotOrBatchNo) {
        return ResponseEntity.ok(batchTraceabilityService.getForwardTraceability(rawLotOrBatchNo));
    }

    @GetMapping("/batch/{batchIdentifier}")
    @Operation(summary = "Universal Batch Genealogy", description = "Automatically identifies and traces any batch (raw lot or finished product) across the full plant lifecycle")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR')")
    public ResponseEntity<BatchTraceabilityResponse> getGenealogy(
            @PathVariable String batchIdentifier) {
        return ResponseEntity.ok(batchTraceabilityService.getGenealogy(batchIdentifier));
    }
}

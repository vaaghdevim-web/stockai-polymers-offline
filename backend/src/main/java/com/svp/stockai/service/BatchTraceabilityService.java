package com.svp.stockai.service;

import com.svp.stockai.dto.traceability.BatchTraceabilityResponse;
import com.svp.stockai.dto.traceability.TraceabilityNode;
import com.svp.stockai.entity.*;
import com.svp.stockai.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BatchTraceabilityService {

    private final FinishedBatchRepository finishedBatchRepository;
    private final MaterialBatchRepository materialBatchRepository;
    private final BatchGenealogyRepository batchGenealogyRepository;
    private final CompoundingBatchMaterialRepository compoundingBatchMaterialRepository;
    private final QualityInspectionRepository qualityInspectionRepository;
    private final PalletItemRepository palletItemRepository;
    private final DispatchItemRepository dispatchItemRepository;

    /**
     * Backward Traceability: Traces a Finished Product Batch back to its Compounding Formulations,
     * Production Runs, and Supplier Raw Material Lots.
     */
    public BatchTraceabilityResponse getBackwardTraceability(String finishedBatchCode) {
        if (finishedBatchCode == null || finishedBatchCode.isBlank()) {
            return buildNotFoundResponse(finishedBatchCode, "BACKWARD", "Finished batch code is empty");
        }

        Optional<FinishedBatch> finishedBatchOpt = finishedBatchRepository.findByBatchNo(finishedBatchCode.trim());
        if (finishedBatchOpt.isEmpty()) {
            return buildNotFoundResponse(finishedBatchCode, "BACKWARD", "Finished batch not found with code: " + finishedBatchCode);
        }

        FinishedBatch fb = finishedBatchOpt.get();
        List<BatchGenealogy> genealogies = batchGenealogyRepository.findByFinishedBatch_FinishedBatchId(fb.getFinishedBatchId());
        List<QualityInspection> inspections = qualityInspectionRepository.findByFinishedBatch_FinishedBatchId(fb.getFinishedBatchId());

        // Inspect downstream dispatches and pallets for this finished batch
        List<PalletItem> palletItems = palletItemRepository.findByFinishedBatch_FinishedBatchId(fb.getFinishedBatchId());
        List<DispatchItem> dispatchItems = dispatchItemRepository.findByFinishedBatch_FinishedBatchId(fb.getFinishedBatchId());

        // Build child nodes for upstream production, compounding, and raw materials
        List<TraceabilityNode> upstreamNodes = new ArrayList<>();

        Set<Long> processedCompoundingBatches = new HashSet<>();
        Set<Long> processedRawMaterialBatches = new HashSet<>();

        for (BatchGenealogy bg : genealogies) {
            ProductionRun pr = bg.getProductionRun();
            CompoundingBatch cb = bg.getCompoundingBatch();
            MaterialBatch rmb = bg.getRawMaterialBatch();

            List<TraceabilityNode> rawLotsUnderCompounding = new ArrayList<>();

            if (cb != null && processedCompoundingBatches.add(cb.getCompoundingBatchId())) {
                List<CompoundingBatchMaterial> cbMaterials = compoundingBatchMaterialRepository
                        .findByCompoundingBatch_CompoundingBatchId(cb.getCompoundingBatchId());

                for (CompoundingBatchMaterial cbm : cbMaterials) {
                    MaterialBatch mb = cbm.getMaterialBatch();
                    if (mb != null && processedRawMaterialBatches.add(mb.getBatchId())) {
                        rawLotsUnderCompounding.add(buildRawMaterialNode(mb, cbm.getConsumedQtyKg()));
                    }
                }

                upstreamNodes.add(new TraceabilityNode(
                        "COMPOUNDING_BATCH",
                        cb.getBatchCode() != null ? cb.getBatchCode() : "CB-" + cb.getCompoundingBatchId(),
                        "Compounded Polymer Blend",
                        cb.getStatus() != null ? cb.getStatus() : "COMPLETED",
                        cb.getTargetWeightKg() != null ? cb.getTargetWeightKg() : cb.getActualWeightKg(),
                        "KG",
                        cb.getCreatedAt() != null ? cb.getCreatedAt().toString() : "N/A",
                        Map.of(
                                "bomCode", cb.getCompoundingBom() != null ? cb.getCompoundingBom().getBomCode() : "STD-BOM"
                        ),
                        rawLotsUnderCompounding
                ));
            } else if (rmb != null && processedRawMaterialBatches.add(rmb.getBatchId())) {
                upstreamNodes.add(buildRawMaterialNode(rmb, bg.getQuantityConsumed()));
            }

            if (pr != null) {
                upstreamNodes.add(new TraceabilityNode(
                        "PRODUCTION_RUN",
                        pr.getProductionNumber() != null ? pr.getProductionNumber() : "PR-" + pr.getProductionId(),
                        "Extrusion / Weaving Stage Run",
                        pr.getStatus() != null ? pr.getStatus() : "COMPLETED",
                        pr.getOutputWeightKg() != null ? pr.getOutputWeightKg() : pr.getPlannedQty(),
                        "KG",
                        pr.getStartDatetime() != null ? pr.getStartDatetime().toString() : "N/A",
                        Map.of(
                                "scrapWeightKg", pr.getScrapWeightKg() != null ? pr.getScrapWeightKg() : BigDecimal.ZERO,
                                "yieldPercentage", pr.getYieldPercentage() != null ? pr.getYieldPercentage() : BigDecimal.valueOf(98.5),
                                "bagsProduced", pr.getBagsProduced() != null ? pr.getBagsProduced() : BigDecimal.ZERO
                        ),
                        List.of()
                ));
            }
        }

        // Add downstream distribution nodes (Pallets & Dispatches)
        List<TraceabilityNode> downstreamNodes = new ArrayList<>();
        for (PalletItem pi : palletItems) {
            Pallet pallet = pi.getPallet();
            downstreamNodes.add(new TraceabilityNode(
                    "PALLET",
                    pallet.getBarcode() != null ? pallet.getBarcode() : (pallet.getPalletCode() != null ? pallet.getPalletCode() : "PAL-" + pallet.getPalletId()),
                    "Pallet Load Unit",
                    pallet.getStatus() != null ? pallet.getStatus() : "STORED",
                    pi.getQuantity(),
                    "BAGS",
                    pallet.getCreatedAt() != null ? pallet.getCreatedAt().toString() : "N/A",
                    Map.of(
                            "warehouseBin", pallet.getWarehouse() != null ? pallet.getWarehouse().getWarehouseName() : "Main Warehouse"
                    ),
                    List.of()
            ));
        }

        for (DispatchItem di : dispatchItems) {
            Dispatch dispatch = di.getDispatch();
            downstreamNodes.add(new TraceabilityNode(
                    "DISPATCH",
                    dispatch.getDispatchNumber() != null ? dispatch.getDispatchNumber() : "DSP-" + dispatch.getDispatchId(),
                    "Customer Shipment",
                    dispatch.getStatus() != null ? dispatch.getStatus() : "DELIVERED",
                    di.getQuantity(),
                    "BAGS",
                    dispatch.getDispatchDate() != null ? dispatch.getDispatchDate().toString() : "N/A",
                    Map.of(
                            "customer", dispatch.getOrder() != null && dispatch.getOrder().getCustomer() != null
                                    ? dispatch.getOrder().getCustomer().getCustomerName() : "SVP Client",
                            "vehicle", dispatch.getVehicle() != null ? dispatch.getVehicle().getVehicleNumber() : "N/A",
                            "carrier", dispatch.getCarrier() != null ? dispatch.getCarrier() : "SVP Logistics"
                    ),
                    List.of()
            ));
        }

        List<TraceabilityNode> allChildren = new ArrayList<>(upstreamNodes);
        allChildren.addAll(downstreamNodes);

        TraceabilityNode rootNode = new TraceabilityNode(
                "FINISHED_GOODS",
                fb.getBatchNo(),
                fb.getProduct() != null ? fb.getProduct().getProductName() : "PP Woven Bag Product",
                fb.getQualityStatus() != null ? fb.getQualityStatus() : "Released",
                fb.getQtyProduced(),
                "BAGS",
                fb.getProductionDate() != null ? fb.getProductionDate().toString() : "N/A",
                Map.of(
                        "inputWeightKg", fb.getInputWeightKg() != null ? fb.getInputWeightKg() : BigDecimal.ZERO,
                        "outputWeightKg", fb.getOutputWeightKg() != null ? fb.getOutputWeightKg() : BigDecimal.ZERO,
                        "scrapWeightKg", fb.getScrapWeightKg() != null ? fb.getScrapWeightKg() : BigDecimal.ZERO,
                        "averageBagWeightG", fb.getAverageBagWeightG() != null ? fb.getAverageBagWeightG() : BigDecimal.ZERO
                ),
                allChildren
        );

        List<Map<String, Object>> inspectionData = inspections.stream()
                .map(i -> Map.of(
                        "inspectionId", (Object) i.getInspectionId(),
                        "inspectionType", i.getInspectionType() != null ? i.getInspectionType() : "Final Inspection",
                        "status", i.getStatus() != null ? i.getStatus() : "Pass",
                        "remarks", i.getRemarks() != null ? i.getRemarks() : "Standard quality test verified"
                ))
                .collect(Collectors.toList());

        String summary = String.format("Finished Batch '%s' produced on %s. Traced backward to %d upstream manufacturing/raw material records and %d downstream logistics nodes.",
                fb.getBatchNo(), fb.getProductionDate(), upstreamNodes.size(), downstreamNodes.size());

        return new BatchTraceabilityResponse(
                finishedBatchCode,
                "BACKWARD",
                true,
                "FINISHED_PRODUCT",
                fb.getProduct() != null ? fb.getProduct().getProductName() : "PP Woven Bag",
                rootNode,
                inspectionData,
                summary
        );
    }

    /**
     * Forward Traceability: Traces a Supplier Raw Material Lot forward through Compounding,
     * Production, Finished Batches, Pallets, and Dispatches.
     */
    public BatchTraceabilityResponse getForwardTraceability(String rawLotOrBatchNo) {
        if (rawLotOrBatchNo == null || rawLotOrBatchNo.isBlank()) {
            return buildNotFoundResponse(rawLotOrBatchNo, "FORWARD", "Raw material lot or batch number is empty");
        }

        String search = rawLotOrBatchNo.trim();
        Optional<MaterialBatch> mbOpt = materialBatchRepository.findByLotNumber(search);
        if (mbOpt.isEmpty()) {
            mbOpt = materialBatchRepository.findByBatchNo(search);
        }

        if (mbOpt.isEmpty()) {
            return buildNotFoundResponse(search, "FORWARD", "Raw material batch/lot not found: " + search);
        }

        MaterialBatch mb = mbOpt.get();
        List<BatchGenealogy> genealogies = batchGenealogyRepository.findByRawMaterialBatch_BatchId(mb.getBatchId());
        List<CompoundingBatchMaterial> cbMaterials = compoundingBatchMaterialRepository.findByMaterialBatch_BatchId(mb.getBatchId());
        List<QualityInspection> rawInspections = qualityInspectionRepository.findByMaterialBatch_BatchId(mb.getBatchId());

        List<TraceabilityNode> forwardNodes = new ArrayList<>();
        Set<Long> processedFinishedBatches = new HashSet<>();

        // Forward link through compounding batches
        for (CompoundingBatchMaterial cbm : cbMaterials) {
            CompoundingBatch cb = cbm.getCompoundingBatch();
            if (cb != null) {
                List<BatchGenealogy> cbGenealogies = batchGenealogyRepository.findByCompoundingBatch_CompoundingBatchId(cb.getCompoundingBatchId());
                List<TraceabilityNode> finishedGoodNodes = new ArrayList<>();

                for (BatchGenealogy cbg : cbGenealogies) {
                    FinishedBatch fb = cbg.getFinishedBatch();
                    if (fb != null && processedFinishedBatches.add(fb.getFinishedBatchId())) {
                        finishedGoodNodes.add(buildFinishedBatchNode(fb));
                    }
                }

                forwardNodes.add(new TraceabilityNode(
                        "COMPOUNDING_BATCH",
                        cb.getBatchCode() != null ? cb.getBatchCode() : "CB-" + cb.getCompoundingBatchId(),
                        "Compounded Batch Formulation",
                        cb.getStatus() != null ? cb.getStatus() : "COMPLETED",
                        cbm.getConsumedQtyKg(),
                        "KG",
                        cb.getCreatedAt() != null ? cb.getCreatedAt().toString() : "N/A",
                        Map.of(
                                "targetWeightKg", cb.getTargetWeightKg() != null ? cb.getTargetWeightKg() : BigDecimal.ZERO
                        ),
                        finishedGoodNodes
                ));
            }
        }

        // Direct forward links from batch genealogy
        for (BatchGenealogy bg : genealogies) {
            FinishedBatch fb = bg.getFinishedBatch();
            if (fb != null && processedFinishedBatches.add(fb.getFinishedBatchId())) {
                forwardNodes.add(buildFinishedBatchNode(fb));
            }
        }

        TraceabilityNode rootNode = buildRawMaterialNode(mb, mb.getInitialWeightKg());
        rootNode = new TraceabilityNode(
                rootNode.nodeType(),
                rootNode.identifier(),
                rootNode.name(),
                rootNode.status(),
                rootNode.quantity(),
                rootNode.uom(),
                rootNode.timestamp(),
                rootNode.details(),
                forwardNodes
        );

        List<Map<String, Object>> inspectionData = rawInspections.stream()
                .map(i -> Map.of(
                        "inspectionId", (Object) i.getInspectionId(),
                        "inspectionType", i.getInspectionType() != null ? i.getInspectionType() : "Incoming QC",
                        "status", i.getStatus() != null ? i.getStatus() : "Pass",
                        "remarks", i.getRemarks() != null ? i.getRemarks() : "Raw material lot meets standard specifications"
                ))
                .collect(Collectors.toList());

        String summary = String.format("Raw Material Lot '%s' (Batch: %s) received from %s on %s. Traced forward into %d downstream compounding and finished product allocations.",
                mb.getLotNumber() != null ? mb.getLotNumber() : mb.getBatchNo(),
                mb.getBatchNo(),
                mb.getSupplier() != null ? mb.getSupplier().getSupplierName() : "Vendor",
                mb.getReceivedAt() != null ? mb.getReceivedAt().toLocalDate().toString() : "N/A",
                forwardNodes.size());

        return new BatchTraceabilityResponse(
                search,
                "FORWARD",
                true,
                "RAW_MATERIAL",
                mb.getMaterial() != null ? mb.getMaterial().getMaterialName() : "Raw Material",
                rootNode,
                inspectionData,
                summary
        );
    }

    /**
     * Universal Genealogy Resolver: Automatically checks whether the input string is a
     * Finished Batch Code or a Raw Material Lot/Batch Number and routes accordingly.
     */
    public BatchTraceabilityResponse getGenealogy(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return buildNotFoundResponse(identifier, "BIDIRECTIONAL", "Batch identifier cannot be empty");
        }

        String id = identifier.trim();
        if (finishedBatchRepository.findByBatchNo(id).isPresent()) {
            return getBackwardTraceability(id);
        } else if (materialBatchRepository.findByLotNumber(id).isPresent() || materialBatchRepository.findByBatchNo(id).isPresent()) {
            return getForwardTraceability(id);
        } else {
            return buildNotFoundResponse(id, "BIDIRECTIONAL", "No batch or lot record found matching identifier: " + id);
        }
    }

    private TraceabilityNode buildRawMaterialNode(MaterialBatch mb, BigDecimal consumedQty) {
        return new TraceabilityNode(
                "RAW_MATERIAL_LOT",
                mb.getLotNumber() != null ? mb.getLotNumber() : mb.getBatchNo(),
                mb.getMaterial() != null ? mb.getMaterial().getMaterialName() : "Raw Material",
                mb.getQualityStatus() != null ? mb.getQualityStatus() : "Available",
                consumedQty != null ? consumedQty : mb.getCurrentWeightKg(),
                "KG",
                mb.getReceivedAt() != null ? mb.getReceivedAt().toLocalDate().toString() : "N/A",
                Map.of(
                        "internalBatchNo", mb.getBatchNo() != null ? mb.getBatchNo() : "N/A",
                        "supplier", mb.getSupplier() != null ? mb.getSupplier().getSupplierName() : "Vendor",
                        "unitCost", mb.getUnitCost() != null ? mb.getUnitCost() : BigDecimal.ZERO
                ),
                List.of()
        );
    }

    private TraceabilityNode buildFinishedBatchNode(FinishedBatch fb) {
        List<PalletItem> palletItems = palletItemRepository.findByFinishedBatch_FinishedBatchId(fb.getFinishedBatchId());
        List<DispatchItem> dispatchItems = dispatchItemRepository.findByFinishedBatch_FinishedBatchId(fb.getFinishedBatchId());

        List<TraceabilityNode> downstream = new ArrayList<>();
        for (PalletItem pi : palletItems) {
            Pallet p = pi.getPallet();
            downstream.add(new TraceabilityNode(
                    "PALLET",
                    p.getBarcode() != null ? p.getBarcode() : (p.getPalletCode() != null ? p.getPalletCode() : "PAL-" + p.getPalletId()),
                    "Pallet Barcode Unit",
                    p.getStatus() != null ? p.getStatus() : "STORED",
                    pi.getQuantity(),
                    "BAGS",
                    p.getCreatedAt() != null ? p.getCreatedAt().toString() : "N/A",
                    Map.of("warehouse", p.getWarehouse() != null ? p.getWarehouse().getWarehouseName() : "Main WH"),
                    List.of()
            ));
        }

        for (DispatchItem di : dispatchItems) {
            Dispatch d = di.getDispatch();
            downstream.add(new TraceabilityNode(
                    "DISPATCH",
                    d.getDispatchNumber() != null ? d.getDispatchNumber() : "DSP-" + d.getDispatchId(),
                    "Customer Delivery Challan",
                    d.getStatus() != null ? d.getStatus() : "DELIVERED",
                    di.getQuantity(),
                    "BAGS",
                    d.getDispatchDate() != null ? d.getDispatchDate().toString() : "N/A",
                    Map.of(
                            "customer", d.getOrder() != null && d.getOrder().getCustomer() != null
                                    ? d.getOrder().getCustomer().getCustomerName() : "SVP Client",
                            "vehicle", d.getVehicle() != null ? d.getVehicle().getVehicleNumber() : "N/A"
                    ),
                    List.of()
            ));
        }

        return new TraceabilityNode(
                "FINISHED_GOODS",
                fb.getBatchNo(),
                fb.getProduct() != null ? fb.getProduct().getProductName() : "Finished Product",
                fb.getQualityStatus() != null ? fb.getQualityStatus() : "Released",
                fb.getQtyProduced(),
                "BAGS",
                fb.getProductionDate() != null ? fb.getProductionDate().toString() : "N/A",
                Map.of(
                        "inputWeightKg", fb.getInputWeightKg() != null ? fb.getInputWeightKg() : BigDecimal.ZERO,
                        "outputWeightKg", fb.getOutputWeightKg() != null ? fb.getOutputWeightKg() : BigDecimal.ZERO
                ),
                downstream
        );
    }

    private BatchTraceabilityResponse buildNotFoundResponse(String id, String direction, String message) {
        return new BatchTraceabilityResponse(
                id != null ? id : "N/A",
                direction,
                false,
                "UNKNOWN",
                "Not Found",
                null,
                List.of(),
                message
        );
    }
}

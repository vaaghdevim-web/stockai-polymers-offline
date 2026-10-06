package com.svp.stockai.service;

import com.svp.stockai.dto.*;
import com.svp.stockai.entity.*;
import com.svp.stockai.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final SupplierRepository supplierRepository;
    private final PlantRepository plantRepository;
    private final RawMaterialRepository rawMaterialRepository;
    private final UnitOfMeasureRepository unitOfMeasureRepository;
    private final PurchaseRecommendationRepository purchaseRecommendationRepository;
    private final AppUserRepository appUserRepository;

    @Transactional
    public PurchaseOrderResponse createPurchaseOrder(CreatePurchaseOrderRequest req, String username) {
        Supplier supplier = supplierRepository.findById(req.getSupplierId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier not found with ID: " + req.getSupplierId()));

        Plant plant = null;
        if (req.getPlantId() != null) {
            plant = plantRepository.findById(req.getPlantId()).orElse(null);
        }
        if (plant == null) {
            plant = plantRepository.findByIsActiveTrue().stream().findFirst()
                    .orElseGet(() -> plantRepository.findAll().stream().findFirst().orElse(null));
        }

        AppUser user = null;
        if (username != null && !username.isBlank()) {
            user = appUserRepository.findByUserName(username).orElse(null);
        }

        LocalDate poDate = req.getPoDate() != null ? req.getPoDate() : LocalDate.now();
        String poNumber = "PO-" + poDate.format(DateTimeFormatter.BASIC_ISO_DATE) + "-" + String.format("%04d", (int)(Math.random() * 9000) + 1000);

        String initialStatus = req.getStatus() != null && !req.getStatus().isBlank() ? req.getStatus() : "Draft";

        PurchaseOrder po = PurchaseOrder.builder()
                .supplier(supplier)
                .plant(plant)
                .poNumber(poNumber)
                .poDate(poDate)
                .status(initialStatus)
                .totalAmount(BigDecimal.ZERO)
                .createdBy(user)
                .build();

        PurchaseOrder savedPo = purchaseOrderRepository.save(po);

        BigDecimal total = BigDecimal.ZERO;
        List<PurchaseOrderItemResponse> itemResponses = new ArrayList<>();

        for (PurchaseOrderItemRequest itemReq : req.getItems()) {
            RawMaterial material = rawMaterialRepository.findById(itemReq.getMaterialId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Material not found with ID: " + itemReq.getMaterialId()));

            UnitOfMeasure uom = null;
            if (itemReq.getUomId() != null) {
                uom = unitOfMeasureRepository.findById(itemReq.getUomId()).orElse(null);
            }
            if (uom == null && material.getDefaultUom() != null) {
                uom = material.getDefaultUom();
            }

            BigDecimal rate = itemReq.getRate() != null ? itemReq.getRate() : (material.getStandardCost() != null ? material.getStandardCost() : BigDecimal.ZERO);
            BigDecimal itemTotal = itemReq.getQuantity().multiply(rate);
            total = total.add(itemTotal);

            PurchaseOrderItem item = PurchaseOrderItem.builder()
                    .purchaseOrder(savedPo)
                    .material(material)
                    .uom(uom)
                    .quantity(itemReq.getQuantity())
                    .rate(rate)
                    .build();

            PurchaseOrderItem savedItem = purchaseOrderItemRepository.save(item);
            itemResponses.add(mapItemToResponse(savedItem));
        }

        savedPo.setTotalAmount(total);
        final PurchaseOrder finalPo = purchaseOrderRepository.save(savedPo);

        // If converted from recommendation, update recommendation
        if (req.getRecommendationId() != null) {
            purchaseRecommendationRepository.findById(req.getRecommendationId()).ifPresent(rec -> {
                rec.setStatus("Converted");
                rec.setConvertedPo(finalPo);
                purchaseRecommendationRepository.save(rec);
            });
        }

        return mapToResponse(finalPo, itemResponses);
    }

    @Transactional(readOnly = true)
    public List<PurchaseOrderResponse> getAllPurchaseOrders(String status) {
        List<PurchaseOrder> orders;
        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            orders = purchaseOrderRepository.findByStatusOrderByPoDateDesc(status);
        } else {
            orders = purchaseOrderRepository.findAllByOrderByPoDateDescPoIdDesc();
        }

        return orders.stream().map(po -> {
            List<PurchaseOrderItemResponse> items = purchaseOrderItemRepository.findByPurchaseOrder_PoId(po.getPoId())
                    .stream().map(this::mapItemToResponse).toList();
            return mapToResponse(po, items);
        }).toList();
    }

    @Transactional(readOnly = true)
    public PurchaseOrderResponse getPurchaseOrderById(Long id) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Purchase order not found with ID: " + id));
        List<PurchaseOrderItemResponse> items = purchaseOrderItemRepository.findByPurchaseOrder_PoId(po.getPoId())
                .stream().map(this::mapItemToResponse).toList();
        return mapToResponse(po, items);
    }

    @Transactional
    public PurchaseOrderResponse approvePurchaseOrder(Long id, String username) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Purchase order not found with ID: " + id));

        if ("Approved".equalsIgnoreCase(po.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Purchase order is already approved");
        }

        AppUser user = null;
        if (username != null && !username.isBlank()) {
            user = appUserRepository.findByUserName(username).orElse(null);
        }

        po.setStatus("Approved");
        po.setUpdatedBy(user);
        PurchaseOrder saved = purchaseOrderRepository.save(po);

        List<PurchaseOrderItemResponse> items = purchaseOrderItemRepository.findByPurchaseOrder_PoId(saved.getPoId())
                .stream().map(this::mapItemToResponse).toList();
        return mapToResponse(saved, items);
    }

    private PurchaseOrderResponse mapToResponse(PurchaseOrder po, List<PurchaseOrderItemResponse> items) {
        return PurchaseOrderResponse.builder()
                .poId(po.getPoId())
                .poNumber(po.getPoNumber())
                .supplierId(po.getSupplier() != null ? po.getSupplier().getSupplierId() : null)
                .supplierCode(po.getSupplier() != null ? po.getSupplier().getGstNo() : null)
                .supplierName(po.getSupplier() != null ? po.getSupplier().getSupplierName() : null)
                .plantId(po.getPlant() != null ? po.getPlant().getPlantId() : null)
                .plantCode(po.getPlant() != null ? po.getPlant().getCity() : null)
                .plantName(po.getPlant() != null ? po.getPlant().getPlantName() : null)
                .poDate(po.getPoDate())
                .status(po.getStatus())
                .totalAmount(po.getTotalAmount())
                .createdByUserName(po.getCreatedBy() != null ? po.getCreatedBy().getUserName() : null)
                .createdAt(po.getCreatedAt())
                .updatedAt(po.getUpdatedAt())
                .items(items)
                .build();
    }

    private PurchaseOrderItemResponse mapItemToResponse(PurchaseOrderItem item) {
        BigDecimal rate = item.getRate() != null ? item.getRate() : BigDecimal.ZERO;
        BigDecimal qty = item.getQuantity() != null ? item.getQuantity() : BigDecimal.ZERO;
        BigDecimal itemTotal = qty.multiply(rate);

        return PurchaseOrderItemResponse.builder()
                .poItemId(item.getPoItemId())
                .poId(item.getPurchaseOrder() != null ? item.getPurchaseOrder().getPoId() : null)
                .materialId(item.getMaterial() != null ? item.getMaterial().getMaterialId() : null)
                .materialCode(item.getMaterial() != null ? item.getMaterial().getMaterialCode() : null)
                .materialName(item.getMaterial() != null ? item.getMaterial().getMaterialName() : null)
                .uomId(item.getUom() != null ? item.getUom().getUomId() : null)
                .uomCode(item.getUom() != null ? item.getUom().getUomCode() : null)
                .quantity(item.getQuantity())
                .rate(item.getRate())
                .itemTotal(itemTotal)
                .build();
    }
}

package com.svp.stockai.service;

import com.svp.stockai.dto.*;
import com.svp.stockai.entity.*;
import com.svp.stockai.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DispatchService {

    private final DispatchRepository dispatchRepository;
    private final DispatchItemRepository dispatchItemRepository;
    private final CustomerOrderRepository customerOrderRepository;
    private final FinishedBatchRepository finishedBatchRepository;
    private final OrderAllocationRepository orderAllocationRepository;
    private final VehicleRepository vehicleRepository;
    private final DriverRepository driverRepository;
    private final InventoryRepository inventoryRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final AppUserRepository appUserRepository;

    @Autowired(required = false)
    private AsyncAlertWorker asyncAlertWorker;

    @Transactional
    public DispatchResponse createDispatch(CreateDispatchRequest request, String currentUsername) {
        CustomerOrder order = customerOrderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Customer Order not found with ID: " + request.getOrderId()));

        Vehicle vehicle = null;
        if (request.getVehicleId() != null) {
            vehicle = vehicleRepository.findById(request.getVehicleId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Vehicle not found with ID: " + request.getVehicleId()));
        }

        Driver driver = null;
        if (request.getDriverId() != null) {
            driver = driverRepository.findById(request.getDriverId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Driver not found with ID: " + request.getDriverId()));
        }

        AppUser createdBy = null;
        if (currentUsername != null && !currentUsername.isBlank()) {
            createdBy = appUserRepository.findByUserName(currentUsername).orElse(null);
        }

        String dispatchNumber = "DSP-" + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE) +
                "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        Dispatch dispatch = Dispatch.builder()
                .order(order)
                .vehicle(vehicle)
                .driver(driver)
                .dispatchNumber(dispatchNumber)
                .dispatchDate(request.getDispatchDate() != null ? request.getDispatchDate() : LocalDate.now())
                .expectedDeliveryDate(request.getExpectedDeliveryDate())
                .status("Prepared")
                .carrier(request.getCarrier())
                .shippingMethod(request.getShippingMethod())
                .trackingNumber(request.getTrackingNumber())
                .createdBy(createdBy)
                .build();

        Dispatch savedDispatch = dispatchRepository.save(dispatch);

        List<DispatchItem> itemsToSave = new ArrayList<>();
        for (DispatchItemRequest itemReq : request.getItems()) {
            FinishedBatch finishedBatch = finishedBatchRepository.findById(itemReq.getFinishedBatchId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Finished Batch not found with ID: " + itemReq.getFinishedBatchId()));

            OrderAllocation allocation = null;
            if (itemReq.getAllocationId() != null) {
                allocation = orderAllocationRepository.findById(itemReq.getAllocationId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                "Order Allocation not found with ID: " + itemReq.getAllocationId()));
            }

            DispatchItem item = DispatchItem.builder()
                    .dispatch(savedDispatch)
                    .finishedBatch(finishedBatch)
                    .allocation(allocation)
                    .quantity(itemReq.getQuantity())
                    .build();

            itemsToSave.add(item);
        }

        List<DispatchItem> savedItems = dispatchItemRepository.saveAll(itemsToSave);

        if (Boolean.TRUE.equals(request.getAutoDispatch())) {
            return markAsDispatched(savedDispatch.getDispatchId(), currentUsername);
        }

        return mapToResponse(savedDispatch, savedItems);
    }

    @Transactional
    public DispatchResponse markAsDispatched(Long dispatchId, String currentUsername) {
        Dispatch dispatch = dispatchRepository.findById(dispatchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Dispatch not found with ID: " + dispatchId));

        if ("Dispatched".equalsIgnoreCase(dispatch.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Dispatch " + dispatch.getDispatchNumber() + " is already marked as Dispatched");
        }
        if ("Delivered".equalsIgnoreCase(dispatch.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cannot re-dispatch a Delivered shipment");
        }
        if ("Cancelled".equalsIgnoreCase(dispatch.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cannot dispatch a Cancelled shipment");
        }

        AppUser user = null;
        if (currentUsername != null && !currentUsername.isBlank()) {
            user = appUserRepository.findByUserName(currentUsername).orElse(null);
        }

        List<DispatchItem> items = dispatchItemRepository.findByDispatch_DispatchId(dispatchId);
        if (items.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cannot dispatch shipment with no items");
        }

        // Deduct finished goods inventory & record ledger transactions
        for (DispatchItem item : items) {
            BigDecimal qty = item.getQuantity();

            List<Inventory> inventoryList = inventoryRepository
                    .findAll()
                    .stream()
                    .filter(inv -> inv.getFinishedBatch() != null &&
                            inv.getFinishedBatch().getFinishedBatchId().equals(item.getFinishedBatch().getFinishedBatchId()) &&
                            inv.getQuantityOnHand().compareTo(BigDecimal.ZERO) > 0)
                    .toList();

            if (!inventoryList.isEmpty()) {
                Inventory inv = inventoryList.get(0);
                BigDecimal currentQty = inv.getQuantityOnHand();
                if (currentQty.compareTo(qty) >= 0) {
                    inv.setQuantityOnHand(currentQty.subtract(qty));
                } else {
                    inv.setQuantityOnHand(BigDecimal.ZERO);
                }
                inventoryRepository.save(inv);

                InventoryTransaction tx = InventoryTransaction.builder()
                        .inventory(inv)
                        .transactionType("Dispatch")
                        .referenceType("Dispatch")
                        .referenceId(dispatch.getDispatchNumber())
                        .quantity(qty)
                        .direction("OUT")
                        .unitCost(item.getFinishedBatch().getProduct() != null ?
                                item.getFinishedBatch().getProduct().getStandardCost() : BigDecimal.ZERO)
                        .transactionDate(OffsetDateTime.now())
                        .createdBy(user)
                        .build();
                inventoryTransactionRepository.save(tx);
            }
        }

        dispatch.setStatus("Dispatched");
        Dispatch updated = dispatchRepository.save(dispatch);

        // Notify logistics / plant supervisor
        if (asyncAlertWorker != null) {
            AlertMessage alert = AlertMessage.builder()
                    .correlationId(UUID.randomUUID().toString())
                    .alertType("DISPATCH_COMPLETED")
                    .severity(AlertSeverity.INFO)
                    .sourceType("DISPATCH")
                    .sourceId(updated.getDispatchNumber())
                    .message("Shipment " + updated.getDispatchNumber() + " dispatched for Order #" +
                            (updated.getOrder() != null ? updated.getOrder().getOrderNumber() : "N/A"))
                    .timestamp(Instant.now())
                    .build();
            asyncAlertWorker.processAlert(alert);
        }

        return mapToResponse(updated, items);
    }

    @Transactional
    public DispatchResponse markAsDelivered(Long dispatchId, String currentUsername) {
        Dispatch dispatch = dispatchRepository.findById(dispatchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Dispatch not found with ID: " + dispatchId));

        if (!"Dispatched".equalsIgnoreCase(dispatch.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Dispatch must be in 'Dispatched' status to mark as Delivered. Current: " + dispatch.getStatus());
        }

        dispatch.setStatus("Delivered");
        dispatch.setActualDeliveryDate(LocalDate.now());
        Dispatch updated = dispatchRepository.save(dispatch);

        List<DispatchItem> items = dispatchItemRepository.findByDispatch_DispatchId(dispatchId);
        return mapToResponse(updated, items);
    }

    @Transactional
    public DispatchResponse cancelDispatch(Long dispatchId, String currentUsername) {
        Dispatch dispatch = dispatchRepository.findById(dispatchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Dispatch not found with ID: " + dispatchId));

        if ("Delivered".equalsIgnoreCase(dispatch.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cannot cancel a Delivered shipment");
        }

        dispatch.setStatus("Cancelled");
        Dispatch updated = dispatchRepository.save(dispatch);

        List<DispatchItem> items = dispatchItemRepository.findByDispatch_DispatchId(dispatchId);
        return mapToResponse(updated, items);
    }

    @Transactional(readOnly = true)
    public DispatchResponse getDispatchById(Long dispatchId) {
        Dispatch dispatch = dispatchRepository.findById(dispatchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Dispatch not found with ID: " + dispatchId));
        List<DispatchItem> items = dispatchItemRepository.findByDispatch_DispatchId(dispatchId);
        return mapToResponse(dispatch, items);
    }

    @Transactional(readOnly = true)
    public List<DispatchResponse> listDispatches(String status, Long orderId) {
        List<Dispatch> dispatches;
        if (status != null && !status.isBlank()) {
            dispatches = dispatchRepository.findByStatus(status);
        } else if (orderId != null) {
            dispatches = dispatchRepository.findByOrder_OrderId(orderId);
        } else {
            dispatches = dispatchRepository.findAll();
        }

        return dispatches.stream()
                .map(d -> {
                    List<DispatchItem> items = dispatchItemRepository.findByDispatch_DispatchId(d.getDispatchId());
                    return mapToResponse(d, items);
                })
                .toList();
    }

    private DispatchResponse mapToResponse(Dispatch d, List<DispatchItem> items) {
        List<DispatchItemResponse> itemResponses = items.stream()
                .map(i -> DispatchItemResponse.builder()
                        .dispatchItemId(i.getDispatchItemId())
                        .allocationId(i.getAllocation() != null ? i.getAllocation().getAllocationId() : null)
                        .finishedBatchId(i.getFinishedBatch() != null ? i.getFinishedBatch().getFinishedBatchId() : null)
                        .finishedBatchNo(i.getFinishedBatch() != null ? i.getFinishedBatch().getBatchNo() : null)
                        .productCode(i.getFinishedBatch() != null && i.getFinishedBatch().getProduct() != null ?
                                i.getFinishedBatch().getProduct().getProductCode() : null)
                        .productName(i.getFinishedBatch() != null && i.getFinishedBatch().getProduct() != null ?
                                i.getFinishedBatch().getProduct().getProductName() : null)
                        .quantity(i.getQuantity())
                        .uom(i.getFinishedBatch() != null && i.getFinishedBatch().getProduct() != null &&
                                i.getFinishedBatch().getProduct().getDefaultUom() != null ?
                                i.getFinishedBatch().getProduct().getDefaultUom().getUomCode() : "BAGS")
                        .build())
                .toList();

        return DispatchResponse.builder()
                .dispatchId(d.getDispatchId())
                .dispatchNumber(d.getDispatchNumber())
                .orderId(d.getOrder() != null ? d.getOrder().getOrderId() : null)
                .orderNumber(d.getOrder() != null ? d.getOrder().getOrderNumber() : null)
                .customerName(d.getOrder() != null && d.getOrder().getCustomer() != null ?
                        d.getOrder().getCustomer().getCustomerName() : null)
                .vehicleId(d.getVehicle() != null ? d.getVehicle().getVehicleId() : null)
                .vehicleNumber(d.getVehicle() != null ? d.getVehicle().getVehicleNumber() : null)
                .driverId(d.getDriver() != null ? d.getDriver().getDriverId() : null)
                .driverName(d.getDriver() != null ? d.getDriver().getDriverName() : null)
                .driverPhone(d.getDriver() != null ? d.getDriver().getPhone() : null)
                .dispatchDate(d.getDispatchDate())
                .expectedDeliveryDate(d.getExpectedDeliveryDate())
                .actualDeliveryDate(d.getActualDeliveryDate())
                .status(d.getStatus())
                .carrier(d.getCarrier())
                .shippingMethod(d.getShippingMethod())
                .trackingNumber(d.getTrackingNumber())
                .createdByUserName(d.getCreatedBy() != null ? d.getCreatedBy().getUserName() : null)
                .createdAt(d.getCreatedAt())
                .items(itemResponses)
                .build();
    }
}

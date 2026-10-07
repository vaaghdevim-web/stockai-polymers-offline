package com.svp.stockai.controller;

import com.svp.stockai.dto.CreatePurchaseOrderRequest;
import com.svp.stockai.dto.PurchaseOrderResponse;
import com.svp.stockai.service.PurchaseOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/procurement/purchase-orders")
@RequiredArgsConstructor
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('PURCHASE_MANAGER', 'SUPERVISOR', 'ADMIN', 'MANAGER', 'PLANT_MANAGER')")
    public PurchaseOrderResponse createPurchaseOrder(
            @Valid @RequestBody CreatePurchaseOrderRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        return purchaseOrderService.createPurchaseOrder(request, username);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('PURCHASE_MANAGER', 'OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER', 'PLANT_MANAGER')")
    public List<PurchaseOrderResponse> listPurchaseOrders(@RequestParam(required = false) String status) {
        return purchaseOrderService.getAllPurchaseOrders(status);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('PURCHASE_MANAGER', 'OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER', 'PLANT_MANAGER')")
    public PurchaseOrderResponse getPurchaseOrder(@PathVariable Long id) {
        return purchaseOrderService.getPurchaseOrderById(id);
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('PURCHASE_MANAGER', 'SUPERVISOR', 'ADMIN', 'MANAGER', 'PLANT_MANAGER')")
    public PurchaseOrderResponse approvePurchaseOrder(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        return purchaseOrderService.approvePurchaseOrder(id, username);
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('PURCHASE_MANAGER', 'SUPERVISOR', 'ADMIN', 'MANAGER', 'PLANT_MANAGER')")
    public PurchaseOrderResponse cancelPurchaseOrder(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        return purchaseOrderService.cancelPurchaseOrder(id, username);
    }
}

package com.svp.stockai.controller;

import com.svp.stockai.dto.FinishedProductResponse;
import com.svp.stockai.entity.FinishedProduct;
import com.svp.stockai.repository.FinishedProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/finished-products")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'MANAGER', 'ADMIN')")
public class FinishedProductController {

    private final FinishedProductRepository finishedProductRepository;

    @GetMapping
    public List<FinishedProductResponse> getAllProducts(
            @RequestParam(required = false, defaultValue = "true") boolean activeOnly) {

        List<FinishedProduct> products = activeOnly ?
                finishedProductRepository.findByIsActiveTrue() :
                finishedProductRepository.findAll();

        return products.stream()
                .map(this::mapToResponse)
                .toList();
    }

    @GetMapping("/{id}")
    public FinishedProductResponse getProductById(@PathVariable Long id) {
        FinishedProduct p = finishedProductRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Finished Product not found with ID: " + id));
        return mapToResponse(p);
    }

    private FinishedProductResponse mapToResponse(FinishedProduct p) {
        return FinishedProductResponse.builder()
                .productId(p.getProductId())
                .productCode(p.getProductCode())
                .productName(p.getProductName())
                .categoryId(p.getCategory() != null ? p.getCategory().getProdCatId() : null)
                .categoryName(p.getCategory() != null ? p.getCategory().getCategoryName() : null)
                .standardCost(p.getStandardCost())
                .defaultUomId(p.getDefaultUom() != null ? p.getDefaultUom().getUomId() : null)
                .defaultUomCode(p.getDefaultUom() != null ? p.getDefaultUom().getUomCode() : null)
                .isActive(p.getIsActive())
                .build();
    }
}

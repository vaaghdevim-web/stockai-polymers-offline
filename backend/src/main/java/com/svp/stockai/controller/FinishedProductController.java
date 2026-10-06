package com.svp.stockai.controller;

import com.svp.stockai.dto.CreateFinishedProductRequest;
import com.svp.stockai.dto.FinishedProductResponse;
import com.svp.stockai.entity.FinishedProduct;
import com.svp.stockai.entity.ProductCategory;
import com.svp.stockai.entity.UnitOfMeasure;
import com.svp.stockai.repository.FinishedProductRepository;
import com.svp.stockai.repository.ProductCategoryRepository;
import com.svp.stockai.repository.UnitOfMeasureRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/finished-products")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'MANAGER', 'ADMIN')")
public class FinishedProductController {

    private final FinishedProductRepository finishedProductRepository;
    private final ProductCategoryRepository productCategoryRepository;
    private final UnitOfMeasureRepository unitOfMeasureRepository;

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

    @GetMapping("/categories")
    public List<Map<String, Object>> getCategories() {
        return productCategoryRepository.findAll().stream()
                .map(c -> Map.<String, Object>of(
                        "categoryId", c.getProdCatId(),
                        "categoryName", c.getCategoryName(),
                        "isActive", c.getIsActive() != null ? c.getIsActive() : true
                ))
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'MANAGER', 'ADMIN')")
    @Transactional
    public FinishedProductResponse createProduct(@Valid @RequestBody CreateFinishedProductRequest request) {
        // Resolve Category
        ProductCategory category = null;
        if (request.getCategoryId() != null) {
            category = productCategoryRepository.findById(request.getCategoryId()).orElse(null);
        }
        if (category == null && request.getCategoryName() != null && !request.getCategoryName().isBlank()) {
            category = productCategoryRepository.findByCategoryNameIgnoreCase(request.getCategoryName().trim())
                    .orElseGet(() -> productCategoryRepository.save(
                            ProductCategory.builder()
                                    .categoryName(request.getCategoryName().trim())
                                    .isActive(true)
                                    .build()
                    ));
        }
        if (category == null) {
            category = productCategoryRepository.findAll().stream().findFirst()
                    .orElseGet(() -> productCategoryRepository.save(
                            ProductCategory.builder()
                                    .categoryName("PP Woven Sacks")
                                    .isActive(true)
                                    .build()
                    ));
        }

        // Resolve UOM
        UnitOfMeasure uom = null;
        if (request.getDefaultUomId() != null) {
            uom = unitOfMeasureRepository.findById(request.getDefaultUomId()).orElse(null);
        }
        if (uom == null) {
            uom = unitOfMeasureRepository.findByUomCode("BAGS")
                    .or(() -> unitOfMeasureRepository.findByUomCode("PCS"))
                    .or(() -> unitOfMeasureRepository.findAll().stream().findFirst())
                    .orElseGet(() -> unitOfMeasureRepository.save(
                            UnitOfMeasure.builder()
                                    .uomCode("BAGS")
                                    .uomType("Quantity")
                                    .build()
                    ));
        }

        // Product Code Generation / Uniqueness
        String productCode = request.getProductCode();
        if (productCode == null || productCode.isBlank()) {
            String sanitized = request.getProductName().trim().toUpperCase().replaceAll("[^A-Z0-9]+", "-");
            productCode = "FP-" + sanitized;
        }

        if (finishedProductRepository.findByProductCode(productCode).isPresent()) {
            productCode = productCode + "-" + (System.currentTimeMillis() % 10000);
        }

        FinishedProduct product = FinishedProduct.builder()
                .productName(request.getProductName().trim())
                .productCode(productCode)
                .category(category)
                .defaultUom(uom)
                .standardCost(request.getStandardCost() != null ? request.getStandardCost() : BigDecimal.ZERO)
                .sellingPrice(request.getSellingPrice() != null ? request.getSellingPrice() : BigDecimal.ZERO)
                .reorderLevel(request.getReorderLevel() != null ? request.getReorderLevel() : BigDecimal.ZERO)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        FinishedProduct saved = finishedProductRepository.save(product);
        return mapToResponse(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'MANAGER', 'ADMIN')")
    @Transactional
    public FinishedProductResponse updateProduct(@PathVariable Long id, @Valid @RequestBody CreateFinishedProductRequest request) {
        FinishedProduct product = finishedProductRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Finished Product not found with ID: " + id));

        if (request.getProductName() != null && !request.getProductName().isBlank()) {
            product.setProductName(request.getProductName().trim());
        }
        if (request.getProductCode() != null && !request.getProductCode().isBlank()) {
            product.setProductCode(request.getProductCode().trim());
        }
        if (request.getCategoryId() != null) {
            productCategoryRepository.findById(request.getCategoryId()).ifPresent(product::setCategory);
        }
        if (request.getDefaultUomId() != null) {
            unitOfMeasureRepository.findById(request.getDefaultUomId()).ifPresent(product::setDefaultUom);
        }
        if (request.getStandardCost() != null) {
            product.setStandardCost(request.getStandardCost());
        }
        if (request.getSellingPrice() != null) {
            product.setSellingPrice(request.getSellingPrice());
        }
        if (request.getReorderLevel() != null) {
            product.setReorderLevel(request.getReorderLevel());
        }
        if (request.getIsActive() != null) {
            product.setIsActive(request.getIsActive());
        }

        FinishedProduct updated = finishedProductRepository.save(product);
        return mapToResponse(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'MANAGER', 'ADMIN')")
    @Transactional
    public Map<String, Object> deleteProduct(@PathVariable Long id) {
        FinishedProduct product = finishedProductRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Finished Product not found with ID: " + id));

        // Soft delete / deactivate to preserve historical batch & order integrity
        product.setIsActive(false);
        finishedProductRepository.save(product);

        return Map.of(
                "success", true,
                "message", "Finished Product SKU '" + product.getProductName() + "' [" + product.getProductCode() + "] deactivated successfully.",
                "productId", id
        );
    }

    private FinishedProductResponse mapToResponse(FinishedProduct p) {
        return FinishedProductResponse.builder()
                .productId(p.getProductId())
                .productCode(p.getProductCode())
                .productName(p.getProductName())
                .categoryId(p.getCategory() != null ? p.getCategory().getProdCatId() : null)
                .categoryName(p.getCategory() != null ? p.getCategory().getCategoryName() : null)
                .standardCost(p.getStandardCost())
                .sellingPrice(p.getSellingPrice())
                .reorderLevel(p.getReorderLevel())
                .defaultUomId(p.getDefaultUom() != null ? p.getDefaultUom().getUomId() : null)
                .defaultUomCode(p.getDefaultUom() != null ? p.getDefaultUom().getUomCode() : null)
                .isActive(p.getIsActive())
                .build();
    }
}

package com.svp.stockai.controller;

import com.svp.stockai.dto.SupplierResponse;
import com.svp.stockai.entity.Supplier;
import com.svp.stockai.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/suppliers")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'MANAGER', 'ADMIN')")
public class SupplierController {

    private final SupplierRepository supplierRepository;

    @GetMapping
    public List<SupplierResponse> getAllSuppliers(
            @RequestParam(required = false, defaultValue = "true") boolean activeOnly) {

        List<Supplier> suppliers = activeOnly ?
                supplierRepository.findByIsActiveTrue() :
                supplierRepository.findAll();

        return suppliers.stream()
                .map(this::mapToResponse)
                .toList();
    }

    @GetMapping("/{id}")
    public SupplierResponse getSupplierById(@PathVariable Long id) {
        Supplier s = supplierRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier not found with ID: " + id));
        return mapToResponse(s);
    }

    private SupplierResponse mapToResponse(Supplier s) {
        return SupplierResponse.builder()
                .supplierId(s.getSupplierId())
                .supplierName(s.getSupplierName())
                .gstNo(s.getGstNo())
                .email(s.getEmail())
                .phone(s.getPhone())
                .address(s.getAddress())
                .isActive(s.getIsActive())
                .build();
    }
}

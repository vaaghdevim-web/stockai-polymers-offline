package com.svp.stockai.controller;

import com.svp.stockai.dto.CreateSupplierRequest;
import com.svp.stockai.dto.SupplierResponse;
import com.svp.stockai.entity.Supplier;
import com.svp.stockai.repository.SupplierRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/suppliers")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'MANAGER', 'ADMIN', 'SUPER_ADMIN', 'FACTORY_DIRECTOR', 'PLANT_MANAGER', 'PURCHASE_MANAGER')")
public class SupplierController {

    private final SupplierRepository supplierRepository;

    @GetMapping
    @Transactional(readOnly = true)
    public List<SupplierResponse> getAllSuppliers(
            @RequestParam(required = false, defaultValue = "false") boolean activeOnly) {

        List<Supplier> suppliers = activeOnly ?
                supplierRepository.findByIsActiveTrue() :
                supplierRepository.findAll();

        return suppliers.stream()
                .map(this::mapToResponse)
                .toList();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public SupplierResponse getSupplierById(@PathVariable Long id) {
        Supplier s = supplierRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier not found with ID: " + id));
        return mapToResponse(s);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    @PreAuthorize("hasAnyRole('PURCHASE_MANAGER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN', 'PLANT_MANAGER')")
    public SupplierResponse createSupplier(@Valid @RequestBody CreateSupplierRequest request) {
        if (request.getGstNo() != null && !request.getGstNo().isBlank()) {
            if (supplierRepository.findByGstNo(request.getGstNo().trim()).isPresent()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Supplier with GSTIN " + request.getGstNo() + " already exists.");
            }
        }

        Supplier supplier = Supplier.builder()
                .supplierName(request.getSupplierName().trim())
                .gstNo(request.getGstNo() != null ? request.getGstNo().trim() : null)
                .email(request.getEmail() != null ? request.getEmail().trim() : null)
                .phone(request.getPhone() != null ? request.getPhone().trim() : null)
                .address(request.getAddress() != null ? request.getAddress().trim() : null)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        Supplier saved = supplierRepository.save(supplier);
        return mapToResponse(saved);
    }

    @PutMapping("/{id}")
    @Transactional
    @PreAuthorize("hasAnyRole('PURCHASE_MANAGER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN', 'PLANT_MANAGER')")
    public SupplierResponse updateSupplier(@PathVariable Long id, @Valid @RequestBody CreateSupplierRequest request) {
        Supplier s = supplierRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier not found with ID: " + id));

        if (request.getGstNo() != null && !request.getGstNo().isBlank()) {
            supplierRepository.findByGstNo(request.getGstNo().trim())
                    .filter(existing -> !existing.getSupplierId().equals(id))
                    .ifPresent(existing -> {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "GSTIN already registered to another supplier.");
                    });
            s.setGstNo(request.getGstNo().trim());
        } else {
            s.setGstNo(null);
        }

        s.setSupplierName(request.getSupplierName().trim());
        s.setEmail(request.getEmail() != null ? request.getEmail().trim() : null);
        s.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        s.setAddress(request.getAddress() != null ? request.getAddress().trim() : null);
        if (request.getIsActive() != null) {
            s.setIsActive(request.getIsActive());
        }

        Supplier updated = supplierRepository.save(s);
        return mapToResponse(updated);
    }

    @PatchMapping("/{id}/toggle-status")
    @Transactional
    @PreAuthorize("hasAnyRole('PURCHASE_MANAGER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN', 'PLANT_MANAGER')")
    public SupplierResponse toggleSupplierStatus(@PathVariable Long id) {
        Supplier s = supplierRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier not found with ID: " + id));

        s.setIsActive(!Boolean.TRUE.equals(s.getIsActive()));
        Supplier saved = supplierRepository.save(s);
        return mapToResponse(saved);
    }

    @DeleteMapping("/{id}")
    @Transactional
    @PreAuthorize("hasAnyRole('PURCHASE_MANAGER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> deleteSupplier(
            @PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean permanent) {

        Supplier s = supplierRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier not found with ID: " + id));

        if (permanent) {
            supplierRepository.delete(s);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Supplier permanently deleted.",
                    "supplierId", id
            ));
        } else {
            s.setIsActive(false);
            supplierRepository.save(s);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Supplier deactivated successfully.",
                    "supplierId", id
            ));
        }
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

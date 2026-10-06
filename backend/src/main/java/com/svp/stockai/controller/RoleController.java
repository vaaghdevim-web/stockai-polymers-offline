package com.svp.stockai.controller;

import com.svp.stockai.dto.CreateRoleRequest;
import com.svp.stockai.entity.AppRole;
import com.svp.stockai.repository.AppRoleRepository;
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
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class RoleController {

    private final AppRoleRepository appRoleRepository;

    @GetMapping
    @Transactional(readOnly = true)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<AppRole>> getAllRoles() {
        return ResponseEntity.ok(appRoleRepository.findAll());
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AppRole> getRoleById(@PathVariable Long id) {
        return appRoleRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<AppRole> createRole(@Valid @RequestBody CreateRoleRequest request) {
        String cleanRoleName = request.getRoleName().trim().toUpperCase().replaceFirst("^ROLE_", "");
        if (cleanRoleName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role name cannot be blank.");
        }

        if (appRoleRepository.findByRoleName(cleanRoleName).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Role " + cleanRoleName + " already exists.");
        }

        AppRole role = AppRole.builder()
                .roleName(cleanRoleName)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        AppRole saved = appRoleRepository.save(role);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<AppRole> updateRole(@PathVariable Long id, @Valid @RequestBody CreateRoleRequest request) {
        AppRole role = appRoleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found with ID: " + id));

        String cleanRoleName = request.getRoleName().trim().toUpperCase().replaceFirst("^ROLE_", "");
        if (cleanRoleName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role name cannot be blank.");
        }

        appRoleRepository.findByRoleName(cleanRoleName)
                .filter(existing -> !existing.getRoleId().equals(id))
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Role " + cleanRoleName + " already exists.");
                });

        role.setRoleName(cleanRoleName);
        if (request.getIsActive() != null) {
            role.setIsActive(request.getIsActive());
        }

        AppRole updated = appRoleRepository.save(role);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> deleteRole(@PathVariable Long id) {
        AppRole role = appRoleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found with ID: " + id));

        if ("ADMIN".equalsIgnoreCase(role.getRoleName()) || "SUPER_ADMIN".equalsIgnoreCase(role.getRoleName())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "System root administrative roles cannot be deleted.");
        }

        appRoleRepository.delete(role);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Role deleted successfully.",
                "roleId", id
        ));
    }

    @GetMapping("/permissions")
    @Transactional(readOnly = true)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, String>>> getPermissions() {
        List<Map<String, String>> permissions = List.of(
                Map.of("id", "PERM_INVENTORY_READ", "name", "View Inventory", "category", "INVENTORY"),
                Map.of("id", "PERM_INVENTORY_WRITE", "name", "Manage Inventory", "category", "INVENTORY"),
                Map.of("id", "PERM_PRODUCTION_READ", "name", "View Production", "category", "PRODUCTION"),
                Map.of("id", "PERM_PRODUCTION_WRITE", "name", "Control Production", "category", "PRODUCTION"),
                Map.of("id", "PERM_QC_READ", "name", "View Quality Control", "category", "QC"),
                Map.of("id", "PERM_QC_WRITE", "name", "Authorize QC Release", "category", "QC"),
                Map.of("id", "PERM_DISPATCH_READ", "name", "View Logistics", "category", "LOGISTICS"),
                Map.of("id", "PERM_DISPATCH_WRITE", "name", "Generate Gate Passes", "category", "LOGISTICS"),
                Map.of("id", "PERM_ADMIN_ACCESS", "name", "Full Administration", "category", "SYSTEM")
        );
        return ResponseEntity.ok(permissions);
    }
}

package com.svp.stockai.controller;

import com.svp.stockai.entity.AppRole;
import com.svp.stockai.repository.AppRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
@Transactional(readOnly = true)
@PreAuthorize("isAuthenticated()")
public class RoleController {

    private final AppRoleRepository appRoleRepository;

    @GetMapping
    public ResponseEntity<List<AppRole>> getAllRoles() {
        return ResponseEntity.ok(appRoleRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppRole> getRoleById(@PathVariable Long id) {
        return appRoleRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/permissions")
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

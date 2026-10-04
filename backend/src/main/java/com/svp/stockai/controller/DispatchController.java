package com.svp.stockai.controller;

import com.svp.stockai.dto.CreateDispatchRequest;
import com.svp.stockai.dto.DispatchResponse;
import com.svp.stockai.service.DispatchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/dispatches")
@RequiredArgsConstructor
public class DispatchController {

    private final DispatchService dispatchService;

    @PostMapping
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'MANAGER', 'ADMIN')")
    public ResponseEntity<DispatchResponse> createDispatch(
            @Valid @RequestBody CreateDispatchRequest request,
            Principal principal) {
        String username = principal != null ? principal.getName() : null;
        DispatchResponse response = dispatchService.createDispatch(request, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'MANAGER', 'ADMIN')")
    public ResponseEntity<List<DispatchResponse>> listDispatches(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long orderId) {
        List<DispatchResponse> responses = dispatchService.listDispatches(status, orderId);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'MANAGER', 'ADMIN')")
    public ResponseEntity<DispatchResponse> getDispatchById(@PathVariable Long id) {
        DispatchResponse response = dispatchService.getDispatchById(id);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/dispatch")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'MANAGER', 'ADMIN')")
    public ResponseEntity<DispatchResponse> markAsDispatched(
            @PathVariable Long id,
            Principal principal) {
        String username = principal != null ? principal.getName() : null;
        DispatchResponse response = dispatchService.markAsDispatched(id, username);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/deliver")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'MANAGER', 'ADMIN')")
    public ResponseEntity<DispatchResponse> markAsDelivered(
            @PathVariable Long id,
            Principal principal) {
        String username = principal != null ? principal.getName() : null;
        DispatchResponse response = dispatchService.markAsDelivered(id, username);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'MANAGER', 'ADMIN')")
    public ResponseEntity<DispatchResponse> cancelDispatch(
            @PathVariable Long id,
            Principal principal) {
        String username = principal != null ? principal.getName() : null;
        DispatchResponse response = dispatchService.cancelDispatch(id, username);
        return ResponseEntity.ok(response);
    }
}

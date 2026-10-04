package com.svp.stockai.controller;

import com.svp.stockai.dto.StockTransferRequest;
import com.svp.stockai.dto.StockTransferResponse;
import com.svp.stockai.service.StockTransferService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/transfers")
@RequiredArgsConstructor
public class StockTransferController {

    private final StockTransferService stockTransferService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public StockTransferResponse createTransfer(
            @Valid @RequestBody StockTransferRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        return stockTransferService.createTransfer(request, username);
    }

    @PatchMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN', 'MANAGER')")
    public StockTransferResponse completeTransfer(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        return stockTransferService.completeTransfer(id, username);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public StockTransferResponse getTransferById(@PathVariable Long id) {
        return stockTransferService.getTransferById(id);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public List<StockTransferResponse> listTransfers(@RequestParam(required = false) String status) {
        return stockTransferService.listTransfers(status);
    }
}

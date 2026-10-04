package com.svp.stockai.controller;

import com.svp.stockai.dto.PurchaseRecommendationResponse;
import com.svp.stockai.dto.ReorderCheckSummaryResponse;
import com.svp.stockai.service.ReorderAlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/procurement")
@RequiredArgsConstructor
public class ReorderAlertController {

    private final ReorderAlertService reorderAlertService;

    @PostMapping("/reorder-check")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public ReorderCheckSummaryResponse triggerReorderCheck() {
        return reorderAlertService.checkReorderLevels();
    }

    @GetMapping("/recommendations")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public List<PurchaseRecommendationResponse> getRecommendations(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority) {
        return reorderAlertService.getRecommendations(status, priority);
    }

    @PatchMapping("/recommendations/{id}/approve")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN', 'MANAGER')")
    public PurchaseRecommendationResponse approveRecommendation(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        return reorderAlertService.approveRecommendation(id, username);
    }
}

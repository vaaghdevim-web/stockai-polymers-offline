package com.svp.stockai.controller;

import com.svp.stockai.dto.AlertAcceptedResponse;
import com.svp.stockai.dto.AlertRequest;
import com.svp.stockai.service.AlertService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;

    @PostMapping({"", "/async"})
    @PreAuthorize("hasAnyRole('OPERATOR', 'ADMIN', 'SUPERVISOR', 'MACHINE')")
    public ResponseEntity<AlertAcceptedResponse> submitAlertAsync(
            @Valid @RequestBody AlertRequest request) {

        AlertAcceptedResponse response = alertService.submitAlert(request);

        return ResponseEntity
                .status(HttpStatus.ACCEPTED)
                .body(response);
    }
}


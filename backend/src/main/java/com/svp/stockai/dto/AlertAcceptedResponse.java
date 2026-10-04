package com.svp.stockai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertAcceptedResponse {

    @Builder.Default
    private String status = "ACCEPTED";

    @Builder.Default
    private String message = "Alert accepted for background processing";

    private String correlationId;

    private Instant timestamp;
}


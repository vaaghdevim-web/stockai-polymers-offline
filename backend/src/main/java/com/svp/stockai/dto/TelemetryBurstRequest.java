package com.svp.stockai.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TelemetryBurstRequest {

    private String gatewayId;

    @NotNull(message = "batchTimestamp is required")
    private Instant batchTimestamp;

    @NotEmpty(message = "packets list cannot be empty")
    @Size(max = 1000, message = "Burst payload cannot exceed 1000 packets per request")
    @Valid
    private List<TelemetryPacketRequest> packets;
}

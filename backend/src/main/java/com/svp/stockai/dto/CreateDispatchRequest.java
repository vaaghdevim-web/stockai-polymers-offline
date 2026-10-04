package com.svp.stockai.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateDispatchRequest {

    @NotNull(message = "Customer Order ID is required")
    private Long orderId;

    private Long vehicleId;

    private Long driverId;

    private String carrier;

    private String shippingMethod;

    private String trackingNumber;

    private LocalDate dispatchDate;

    private LocalDate expectedDeliveryDate;

    @NotEmpty(message = "Dispatch items cannot be empty")
    @Valid
    private List<DispatchItemRequest> items;

    @Builder.Default
    private Boolean autoDispatch = false;
}

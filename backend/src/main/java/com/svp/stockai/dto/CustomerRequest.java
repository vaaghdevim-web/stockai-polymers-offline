package com.svp.stockai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerRequest {

    @NotBlank(message = "Customer name is required")
    private String customerName;

    private String customerCode;

    private String email;

    private String phone;

    @Builder.Default
    private Boolean isActive = true;
}

package com.svp.stockai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSupplierRequest {

    @NotBlank(message = "Supplier name is required")
    @Size(max = 150, message = "Supplier name cannot exceed 150 characters")
    private String supplierName;

    @Size(max = 30, message = "GST number cannot exceed 30 characters")
    private String gstNo;

    @Size(max = 255, message = "Email cannot exceed 255 characters")
    private String email;

    @Size(max = 30, message = "Phone number cannot exceed 30 characters")
    private String phone;

    private String address;

    @Builder.Default
    private Boolean isActive = true;
}

package com.svp.stockai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupplierResponse {
    private Long supplierId;
    private String supplierName;
    private String gstNo;
    private String email;
    private String phone;
    private String address;
    private Boolean isActive;
}

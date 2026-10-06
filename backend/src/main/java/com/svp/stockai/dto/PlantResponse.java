package com.svp.stockai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlantResponse {
    private Long plantId;
    private String plantName;
    private String city;
    private String state;
    private String country;
    private Boolean isActive;
}

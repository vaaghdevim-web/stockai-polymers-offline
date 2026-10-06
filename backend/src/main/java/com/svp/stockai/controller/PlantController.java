package com.svp.stockai.controller;

import com.svp.stockai.dto.PlantResponse;
import com.svp.stockai.entity.Plant;
import com.svp.stockai.repository.PlantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/plants")
@RequiredArgsConstructor
@Transactional(readOnly = true)
@PreAuthorize("isAuthenticated()")
public class PlantController {

    private final PlantRepository plantRepository;

    @GetMapping
    public List<PlantResponse> getAllPlants() {
        return plantRepository.findAll().stream()
                .map(this::mapToPlantResponse)
                .toList();
    }

    private PlantResponse mapToPlantResponse(Plant p) {
        return PlantResponse.builder()
                .plantId(p.getPlantId())
                .plantName(p.getPlantName())
                .city(p.getCity())
                .state(p.getState())
                .country(p.getCountry())
                .isActive(p.getIsActive())
                .build();
    }
}

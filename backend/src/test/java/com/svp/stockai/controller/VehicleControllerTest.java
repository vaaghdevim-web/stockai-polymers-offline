package com.svp.stockai.controller;

import com.svp.stockai.entity.Vehicle;
import com.svp.stockai.repository.UnitOfMeasureRepository;
import com.svp.stockai.repository.VehicleRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(VehicleController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class VehicleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private VehicleRepository vehicleRepository;

    @MockitoBean
    private UnitOfMeasureRepository unitOfMeasureRepository;

    @Test
    @DisplayName("GET /api/v1/vehicles returns all vehicles")
    void getAllVehicles_ReturnsList() throws Exception {
        Vehicle v = Vehicle.builder()
                .vehicleId(1L)
                .vehicleNumber("KA-01-EQ-9988")
                .vehicleType("Heavy Truck (16T)")
                .capacity(new BigDecimal("16000.00"))
                .isActive(true)
                .build();

        when(vehicleRepository.findAll()).thenReturn(List.of(v));

        mockMvc.perform(get("/api/v1/vehicles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].vehicleId").value(1))
                .andExpect(jsonPath("$[0].vehicleNumber").value("KA-01-EQ-9988"));
    }

    @Test
    @DisplayName("POST /api/v1/vehicles creates a new vehicle")
    void createVehicle_ReturnsCreated() throws Exception {
        Vehicle v = Vehicle.builder()
                .vehicleId(2L)
                .vehicleNumber("TN-09-AB-1234")
                .vehicleType("Container (24T)")
                .capacity(new BigDecimal("24000.00"))
                .isActive(true)
                .build();

        when(vehicleRepository.findByVehicleNumber("TN-09-AB-1234")).thenReturn(Optional.empty());
        when(vehicleRepository.save(any(Vehicle.class))).thenReturn(v);

        String payload = """
                {
                    "vehicleNumber": "TN-09-AB-1234",
                    "vehicleType": "Container (24T)",
                    "capacity": 24000.00,
                    "isActive": true
                }
                """;

        mockMvc.perform(post("/api/v1/vehicles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.vehicleId").value(2))
                .andExpect(jsonPath("$.vehicleNumber").value("TN-09-AB-1234"));
    }

    @Test
    @DisplayName("PUT /api/v1/vehicles/{id} updates vehicle")
    void updateVehicle_ReturnsUpdated() throws Exception {
        Vehicle existing = Vehicle.builder()
                .vehicleId(1L)
                .vehicleNumber("KA-01-EQ-9988")
                .vehicleType("Heavy Truck (16T)")
                .capacity(new BigDecimal("16000.00"))
                .isActive(true)
                .build();

        when(vehicleRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(vehicleRepository.findByVehicleNumber("KA-01-EQ-9988")).thenReturn(Optional.of(existing));
        when(vehicleRepository.save(any(Vehicle.class))).thenReturn(existing);

        String payload = """
                {
                    "vehicleNumber": "KA-01-EQ-9988",
                    "vehicleType": "Heavy Truck (18T)",
                    "capacity": 18000.00,
                    "isActive": true
                }
                """;

        mockMvc.perform(put("/api/v1/vehicles/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.vehicleId").value(1));
    }

    @Test
    @DisplayName("DELETE /api/v1/vehicles/{id} removes vehicle")
    void deleteVehicle_ReturnsNoContent() throws Exception {
        Vehicle existing = Vehicle.builder()
                .vehicleId(1L)
                .vehicleNumber("KA-01-EQ-9988")
                .build();

        when(vehicleRepository.findById(1L)).thenReturn(Optional.of(existing));

        mockMvc.perform(delete("/api/v1/vehicles/1"))
                .andExpect(status().isNoContent());
    }
}

package com.svp.stockai.controller;

import com.svp.stockai.entity.Driver;
import com.svp.stockai.repository.DriverRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DriverController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class DriverControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DriverRepository driverRepository;

    @Test
    @DisplayName("GET /api/v1/drivers returns all drivers")
    void getAllDrivers_ReturnsList() throws Exception {
        Driver d = Driver.builder()
                .driverId(1L)
                .driverName("Ramesh Kumar")
                .licenseNumber("DL-9876543210")
                .licenseExpiry(LocalDate.of(2028, 5, 20))
                .phone("+91-9876543210")
                .isActive(true)
                .build();

        when(driverRepository.findAll()).thenReturn(List.of(d));

        mockMvc.perform(get("/api/v1/drivers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].driverId").value(1))
                .andExpect(jsonPath("$[0].driverName").value("Ramesh Kumar"));
    }

    @Test
    @DisplayName("POST /api/v1/drivers creates a new driver")
    void createDriver_ReturnsCreated() throws Exception {
        Driver d = Driver.builder()
                .driverId(2L)
                .driverName("Suresh Nair")
                .licenseNumber("DL-1234567890")
                .licenseExpiry(LocalDate.of(2029, 1, 15))
                .phone("+91-9123456789")
                .isActive(true)
                .build();

        when(driverRepository.findByLicenseNumber("DL-1234567890")).thenReturn(Optional.empty());
        when(driverRepository.save(any(Driver.class))).thenReturn(d);

        String payload = """
                {
                    "driverName": "Suresh Nair",
                    "licenseNumber": "DL-1234567890",
                    "licenseExpiry": "2029-01-15",
                    "phone": "+91-9123456789",
                    "isActive": true
                }
                """;

        mockMvc.perform(post("/api/v1/drivers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.driverId").value(2))
                .andExpect(jsonPath("$.driverName").value("Suresh Nair"));
    }

    @Test
    @DisplayName("DELETE /api/v1/drivers/{id} deletes driver")
    void deleteDriver_ReturnsNoContent() throws Exception {
        Driver d = Driver.builder()
                .driverId(1L)
                .driverName("Ramesh Kumar")
                .licenseNumber("DL-9876543210")
                .build();

        when(driverRepository.findById(1L)).thenReturn(Optional.of(d));

        mockMvc.perform(delete("/api/v1/drivers/1"))
                .andExpect(status().isNoContent());
    }
}

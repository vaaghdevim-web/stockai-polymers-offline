package com.svp.stockai.controller;

import com.svp.stockai.entity.Customer;
import com.svp.stockai.repository.CustomerRepository;
import com.svp.stockai.service.CustomerOrderService;
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

@WebMvcTest(CustomerController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class CustomerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CustomerRepository customerRepository;

    @MockitoBean
    private CustomerOrderService customerOrderService;

    @Test
    @DisplayName("GET /api/v1/customers returns active customers")
    void getAllCustomers_ReturnsList() throws Exception {
        Customer c = Customer.builder()
                .customerId(1L)
                .customerCode("CUST-PACK-01")
                .customerName("Apex Packaging Industries")
                .isActive(true)
                .build();

        when(customerRepository.findByIsActiveTrue()).thenReturn(List.of(c));

        mockMvc.perform(get("/api/v1/customers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].customerId").value(1))
                .andExpect(jsonPath("$[0].customerName").value("Apex Packaging Industries"));
    }

    @Test
    @DisplayName("POST /api/v1/customers creates a new customer")
    void createCustomer_ReturnsCreated() throws Exception {
        Customer c = Customer.builder()
                .customerId(2L)
                .customerCode("CUST-NEW-01")
                .customerName("Global Polymers Inc")
                .isActive(true)
                .build();

        when(customerRepository.findByCustomerCode("CUST-NEW-01")).thenReturn(Optional.empty());
        when(customerRepository.save(any(Customer.class))).thenReturn(c);

        String payload = """
                {
                    "customerCode": "CUST-NEW-01",
                    "customerName": "Global Polymers Inc",
                    "phone": "+91-9876543210",
                    "email": "contact@globalpolymers.com",
                    "isActive": true
                }
                """;

        mockMvc.perform(post("/api/v1/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.customerId").value(2))
                .andExpect(jsonPath("$.customerCode").value("CUST-NEW-01"));
    }

    @Test
    @DisplayName("DELETE /api/v1/customers/{id} deletes customer")
    void deleteCustomer_ReturnsNoContent() throws Exception {
        Customer c = Customer.builder()
                .customerId(1L)
                .customerCode("CUST-PACK-01")
                .customerName("Apex Packaging Industries")
                .build();

        when(customerRepository.findById(1L)).thenReturn(Optional.of(c));

        mockMvc.perform(delete("/api/v1/customers/1"))
                .andExpect(status().isNoContent());
    }
}

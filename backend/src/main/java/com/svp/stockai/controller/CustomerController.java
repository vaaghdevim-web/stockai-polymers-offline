package com.svp.stockai.controller;

import com.svp.stockai.dto.CustomerResponse;
import com.svp.stockai.entity.Customer;
import com.svp.stockai.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'MANAGER', 'ADMIN')")
public class CustomerController {

    private final CustomerRepository customerRepository;

    @GetMapping
    public List<CustomerResponse> getAllCustomers(
            @RequestParam(required = false, defaultValue = "true") boolean activeOnly) {

        List<Customer> customers = activeOnly ?
                customerRepository.findByIsActiveTrue() :
                customerRepository.findAll();

        return customers.stream()
                .map(this::mapToResponse)
                .toList();
    }

    @GetMapping("/{id}")
    public CustomerResponse getCustomerById(@PathVariable Long id) {
        Customer c = customerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found with ID: " + id));
        return mapToResponse(c);
    }

    private CustomerResponse mapToResponse(Customer c) {
        return CustomerResponse.builder()
                .customerId(c.getCustomerId())
                .customerName(c.getCustomerName())
                .customerCode(c.getCustomerCode())
                .email(c.getEmail())
                .phone(c.getPhone())
                .isActive(c.getIsActive())
                .build();
    }
}

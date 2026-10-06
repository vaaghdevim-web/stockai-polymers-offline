package com.svp.stockai.controller;

import com.svp.stockai.dto.CreateCustomerOrderRequest;
import com.svp.stockai.dto.CustomerOrderResponse;
import com.svp.stockai.dto.CustomerResponse;
import com.svp.stockai.entity.Customer;
import com.svp.stockai.repository.CustomerRepository;
import com.svp.stockai.service.CustomerOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'MANAGER', 'ADMIN', 'DISPATCH_EXECUTIVE', 'WAREHOUSE_INCHARGE', 'WAREHOUSE_EXECUTIVE', 'FACTORY_DIRECTOR', 'ACCOUNTS_TEAM')")
public class CustomerController {

    private final CustomerRepository customerRepository;
    private final CustomerOrderService customerOrderService;

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

    @GetMapping("/orders")
    public ResponseEntity<List<CustomerOrderResponse>> getCustomerOrders(
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(customerOrderService.getOrders(customerId, status));
    }

    @GetMapping("/{customerId}/orders")
    public ResponseEntity<List<CustomerOrderResponse>> getOrdersByCustomerId(@PathVariable Long customerId) {
        return ResponseEntity.ok(customerOrderService.getOrders(customerId, null));
    }

    @GetMapping("/orders/{orderId}")
    public ResponseEntity<CustomerOrderResponse> getOrderById(@PathVariable Long orderId) {
        return ResponseEntity.ok(customerOrderService.getOrderById(orderId));
    }

    @PostMapping("/orders")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'MANAGER', 'ADMIN', 'DISPATCH_EXECUTIVE', 'FACTORY_DIRECTOR', 'ACCOUNTS_TEAM')")
    public ResponseEntity<CustomerOrderResponse> createOrder(
            @Valid @RequestBody CreateCustomerOrderRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        CustomerOrderResponse response = customerOrderService.createOrder(request, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
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

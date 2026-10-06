package com.svp.stockai.service;

import com.svp.stockai.dto.CreateCustomerOrderRequest;
import com.svp.stockai.dto.CustomerOrderItemResponse;
import com.svp.stockai.dto.CustomerOrderResponse;
import com.svp.stockai.entity.*;
import com.svp.stockai.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomerOrderService {

    private final CustomerOrderRepository customerOrderRepository;
    private final CustomerOrderItemRepository customerOrderItemRepository;
    private final CustomerRepository customerRepository;
    private final PlantRepository plantRepository;
    private final FinishedProductRepository finishedProductRepository;
    private final AppUserRepository appUserRepository;

    @Transactional(readOnly = true)
    public List<CustomerOrderResponse> getOrders(Long customerId, String status) {
        List<CustomerOrder> orders;
        if (customerId != null) {
            orders = customerOrderRepository.findByCustomer_CustomerId(customerId);
            if (status != null && !status.isBlank()) {
                orders = orders.stream().filter(o -> status.equalsIgnoreCase(o.getStatus())).toList();
            }
        } else if (status != null && !status.isBlank()) {
            orders = customerOrderRepository.findByStatus(status);
        } else {
            orders = customerOrderRepository.findAll();
        }

        return orders.stream().map(this::mapToResponse).toList();
    }

    @Transactional(readOnly = true)
    public CustomerOrderResponse getOrderById(Long orderId) {
        CustomerOrder order = customerOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer order not found: " + orderId));
        return mapToResponse(order);
    }

    @Transactional
    public CustomerOrderResponse createOrder(CreateCustomerOrderRequest request, String username) {
        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found: " + request.getCustomerId()));

        Plant plant = null;
        if (request.getPlantId() != null) {
            plant = plantRepository.findById(request.getPlantId()).orElse(null);
        }
        if (plant == null) {
            plant = plantRepository.findAll().stream().findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No plant found in system"));
        }

        AppUser creator = null;
        if (username != null) {
            creator = appUserRepository.findByUserName(username).orElse(null);
        }

        String orderNumber = request.getOrderNumber();
        if (orderNumber == null || orderNumber.isBlank()) {
            long count = customerOrderRepository.count() + 1;
            orderNumber = String.format("SO-%d-%04d", LocalDate.now().getYear(), count);
        }

        CustomerOrder order = CustomerOrder.builder()
                .customer(customer)
                .plant(plant)
                .orderNumber(orderNumber)
                .orderDate(LocalDate.now())
                .requiredDate(request.getRequiredDate() != null ? request.getRequiredDate() : LocalDate.now().plusDays(7))
                .status("Open")
                .paymentStatus(request.getPaymentStatus() != null ? request.getPaymentStatus() : "Pending")
                .subtotal(BigDecimal.ZERO)
                .discountAmount(BigDecimal.ZERO)
                .taxAmount(BigDecimal.ZERO)
                .grandTotal(BigDecimal.ZERO)
                .createdBy(creator)
                .build();

        CustomerOrder savedOrder = customerOrderRepository.save(order);

        List<CustomerOrderItem> savedItems = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        if (request.getItems() != null && !request.getItems().isEmpty()) {
            for (CreateCustomerOrderRequest.OrderItemRequest itemReq : request.getItems()) {
                FinishedProduct product = finishedProductRepository.findById(itemReq.getProductId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Finished product not found: " + itemReq.getProductId()));

                BigDecimal qty = itemReq.getEffectiveQty();
                if (qty == null || qty.compareTo(BigDecimal.ZERO) <= 0) {
                    qty = new BigDecimal("1000");
                }

                BigDecimal rate = itemReq.getEffectiveRate() != null
                        ? itemReq.getEffectiveRate()
                        : (product.getStandardCost() != null && product.getStandardCost().compareTo(BigDecimal.ZERO) > 0
                                ? product.getStandardCost().multiply(new BigDecimal("1.25"))
                                : new BigDecimal("55.00"));

                BigDecimal lineTotal = qty.multiply(rate);
                subtotal = subtotal.add(lineTotal);

                CustomerOrderItem item = CustomerOrderItem.builder()
                        .order(savedOrder)
                        .product(product)
                        .orderedQty(qty)
                        .fulfilledQty(BigDecimal.ZERO)
                        .pendingQty(qty)
                        .rate(rate)
                        .discountAmount(BigDecimal.ZERO)
                        .taxAmount(BigDecimal.ZERO)
                        .build();

                savedItems.add(customerOrderItemRepository.save(item));
            }
        } else {
            // Default item if none provided
            FinishedProduct defaultProduct = finishedProductRepository.findAll().stream().findFirst().orElse(null);
            if (defaultProduct != null) {
                BigDecimal qty = new BigDecimal("5000");
                BigDecimal rate = defaultProduct.getStandardCost() != null ? defaultProduct.getStandardCost().multiply(new BigDecimal("1.25")) : new BigDecimal("55.00");
                subtotal = qty.multiply(rate);

                CustomerOrderItem defaultItem = CustomerOrderItem.builder()
                        .order(savedOrder)
                        .product(defaultProduct)
                        .orderedQty(qty)
                        .fulfilledQty(BigDecimal.ZERO)
                        .pendingQty(qty)
                        .rate(rate)
                        .discountAmount(BigDecimal.ZERO)
                        .taxAmount(BigDecimal.ZERO)
                        .build();

                savedItems.add(customerOrderItemRepository.save(defaultItem));
            }
        }

        BigDecimal tax = subtotal.multiply(new BigDecimal("0.18")); // 18% GST standard
        BigDecimal grandTotal = subtotal.add(tax);

        savedOrder.setSubtotal(subtotal);
        savedOrder.setTaxAmount(tax);
        savedOrder.setGrandTotal(grandTotal);
        savedOrder = customerOrderRepository.save(savedOrder);

        return mapToResponse(savedOrder, savedItems);
    }

    public CustomerOrderResponse mapToResponse(CustomerOrder order) {
        List<CustomerOrderItem> items = customerOrderItemRepository.findByOrder_OrderId(order.getOrderId());
        return mapToResponse(order, items);
    }

    public CustomerOrderResponse mapToResponse(CustomerOrder order, List<CustomerOrderItem> items) {
        List<CustomerOrderItemResponse> itemResponses = items.stream().map(item -> {
            BigDecimal lineTotal = (item.getOrderedQty() != null ? item.getOrderedQty() : BigDecimal.ZERO)
                    .multiply(item.getRate() != null ? item.getRate() : BigDecimal.ZERO);

            return CustomerOrderItemResponse.builder()
                    .orderItemId(item.getOrderItemId())
                    .orderId(order.getOrderId())
                    .productId(item.getProduct() != null ? item.getProduct().getProductId() : null)
                    .productCode(item.getProduct() != null ? item.getProduct().getProductCode() : null)
                    .productName(item.getProduct() != null ? item.getProduct().getProductName() : null)
                    .orderedQty(item.getOrderedQty())
                    .fulfilledQty(item.getFulfilledQty())
                    .pendingQty(item.getPendingQty())
                    .rate(item.getRate())
                    .discountAmount(item.getDiscountAmount())
                    .taxAmount(item.getTaxAmount())
                    .lineTotal(lineTotal)
                    .build();
        }).toList();

        return CustomerOrderResponse.builder()
                .orderId(order.getOrderId())
                .orderNumber(order.getOrderNumber())
                .customerId(order.getCustomer() != null ? order.getCustomer().getCustomerId() : null)
                .customerName(order.getCustomer() != null ? order.getCustomer().getCustomerName() : null)
                .customerCode(order.getCustomer() != null ? order.getCustomer().getCustomerCode() : null)
                .plantId(order.getPlant() != null ? order.getPlant().getPlantId() : null)
                .plantName(order.getPlant() != null ? order.getPlant().getPlantName() : null)
                .orderDate(order.getOrderDate())
                .requiredDate(order.getRequiredDate())
                .status(order.getStatus())
                .subtotal(order.getSubtotal())
                .discountAmount(order.getDiscountAmount())
                .taxAmount(order.getTaxAmount())
                .grandTotal(order.getGrandTotal())
                .paymentStatus(order.getPaymentStatus())
                .items(itemResponses)
                .createdAt(order.getCreatedAt())
                .build();
    }
}

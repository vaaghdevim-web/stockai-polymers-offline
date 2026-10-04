package com.svp.stockai.service;

import com.svp.stockai.dto.CreateDispatchRequest;
import com.svp.stockai.dto.DispatchItemRequest;
import com.svp.stockai.dto.DispatchResponse;
import com.svp.stockai.entity.*;
import com.svp.stockai.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DispatchServiceTest {

    private DispatchRepository dispatchRepo;
    private DispatchItemRepository dispatchItemRepo;
    private CustomerOrderRepository customerOrderRepo;
    private FinishedBatchRepository finishedBatchRepo;
    private OrderAllocationRepository orderAllocationRepo;
    private VehicleRepository vehicleRepo;
    private DriverRepository driverRepo;
    private InventoryRepository inventoryRepo;
    private InventoryTransactionRepository inventoryTxRepo;
    private AppUserRepository userRepo;
    private AsyncAlertWorker alertWorker;
    private DispatchService service;

    private CustomerOrder order;
    private FinishedBatch finishedBatch;
    private Vehicle vehicle;
    private Driver driver;
    private AppUser user;
    private Inventory inventory;

    @BeforeEach
    void setUp() {
        dispatchRepo = mock(DispatchRepository.class);
        dispatchItemRepo = mock(DispatchItemRepository.class);
        customerOrderRepo = mock(CustomerOrderRepository.class);
        finishedBatchRepo = mock(FinishedBatchRepository.class);
        orderAllocationRepo = mock(OrderAllocationRepository.class);
        vehicleRepo = mock(VehicleRepository.class);
        driverRepo = mock(DriverRepository.class);
        inventoryRepo = mock(InventoryRepository.class);
        inventoryTxRepo = mock(InventoryTransactionRepository.class);
        userRepo = mock(AppUserRepository.class);
        alertWorker = mock(AsyncAlertWorker.class);

        service = new DispatchService(
                dispatchRepo,
                dispatchItemRepo,
                customerOrderRepo,
                finishedBatchRepo,
                orderAllocationRepo,
                vehicleRepo,
                driverRepo,
                inventoryRepo,
                inventoryTxRepo,
                userRepo
        );
        ReflectionTestUtils.setField(service, "asyncAlertWorker", alertWorker);

        user = AppUser.builder()
                .userId(1L)
                .userName("supervisor01")
                .build();

        Customer customer = Customer.builder()
                .customerId(1L)
                .customerName("IFFCO Fertilizer Corp")
                .customerCode("CUST-IFFCO-01")
                .build();

        order = CustomerOrder.builder()
                .orderId(10L)
                .orderNumber("ORD-2026-001")
                .customer(customer)
                .status("Open")
                .build();

        FinishedProduct product = FinishedProduct.builder()
                .productId(100L)
                .productCode("FP-BAG-50KG-01")
                .productName("50kg PP Woven Fertilizer Bag")
                .standardCost(new BigDecimal("28.50"))
                .build();

        finishedBatch = FinishedBatch.builder()
                .finishedBatchId(50L)
                .batchNo("FB-2026-BAG-01")
                .product(product)
                .qtyProduced(new BigDecimal("10000"))
                .qualityStatus("Available")
                .build();

        vehicle = Vehicle.builder()
                .vehicleId(1L)
                .vehicleNumber("AP-16-TX-9874")
                .vehicleType("10-Ton Truck")
                .build();

        driver = Driver.builder()
                .driverId(1L)
                .driverName("Ramesh Kumar")
                .phone("+91 98480 12345")
                .build();

        inventory = Inventory.builder()
                .inventoryId(200L)
                .finishedBatch(finishedBatch)
                .quantityOnHand(new BigDecimal("10000"))
                .build();

        when(userRepo.findByUserName("supervisor01")).thenReturn(Optional.of(user));
        when(customerOrderRepo.findById(10L)).thenReturn(Optional.of(order));
        when(finishedBatchRepo.findById(50L)).thenReturn(Optional.of(finishedBatch));
        when(vehicleRepo.findById(1L)).thenReturn(Optional.of(vehicle));
        when(driverRepo.findById(1L)).thenReturn(Optional.of(driver));
    }

    @Test
    @DisplayName("Should successfully create a Prepared dispatch challan")
    void testCreateDispatch_Success() {
        CreateDispatchRequest request = CreateDispatchRequest.builder()
                .orderId(10L)
                .vehicleId(1L)
                .driverId(1L)
                .carrier("Sri Vidha Logistics")
                .shippingMethod("Road Transport")
                .trackingNumber("TRK-2026-01")
                .dispatchDate(LocalDate.now())
                .items(List.of(
                        DispatchItemRequest.builder()
                                .finishedBatchId(50L)
                                .quantity(new BigDecimal("3000"))
                                .build()
                ))
                .build();

        when(dispatchRepo.save(any(Dispatch.class))).thenAnswer(inv -> {
            Dispatch d = inv.getArgument(0);
            d.setDispatchId(1L);
            return d;
        });

        when(dispatchItemRepo.saveAll(anyList())).thenAnswer(inv -> {
            List<DispatchItem> items = inv.getArgument(0);
            for (int i = 0; i < items.size(); i++) {
                items.get(i).setDispatchItemId((long) (i + 1));
            }
            return items;
        });

        DispatchResponse res = service.createDispatch(request, "supervisor01");

        assertNotNull(res);
        assertEquals(1L, res.getDispatchId());
        assertEquals("Prepared", res.getStatus());
        assertEquals("ORD-2026-001", res.getOrderNumber());
        assertEquals("IFFCO Fertilizer Corp", res.getCustomerName());
        assertEquals("AP-16-TX-9874", res.getVehicleNumber());
        assertEquals("Ramesh Kumar", res.getDriverName());
        assertEquals(1, res.getItems().size());
        assertEquals(new BigDecimal("3000"), res.getItems().get(0).getQuantity());

        verify(dispatchRepo, times(1)).save(any(Dispatch.class));
        verify(dispatchItemRepo, times(1)).saveAll(anyList());
    }

    @Test
    @DisplayName("Should successfully transition Prepared dispatch to Dispatched and deduct inventory")
    void testMarkAsDispatched_Success() {
        Dispatch dispatch = Dispatch.builder()
                .dispatchId(1L)
                .dispatchNumber("DSP-20260922-001")
                .order(order)
                .vehicle(vehicle)
                .driver(driver)
                .status("Prepared")
                .build();

        DispatchItem item = DispatchItem.builder()
                .dispatchItemId(1L)
                .dispatch(dispatch)
                .finishedBatch(finishedBatch)
                .quantity(new BigDecimal("3000"))
                .build();

        when(dispatchRepo.findById(1L)).thenReturn(Optional.of(dispatch));
        when(dispatchItemRepo.findByDispatch_DispatchId(1L)).thenReturn(List.of(item));
        when(inventoryRepo.findAll()).thenReturn(List.of(inventory));
        when(dispatchRepo.save(any(Dispatch.class))).thenAnswer(inv -> inv.getArgument(0));

        DispatchResponse res = service.markAsDispatched(1L, "supervisor01");

        assertEquals("Dispatched", res.getStatus());
        assertEquals(new BigDecimal("7000"), inventory.getQuantityOnHand());

        verify(inventoryRepo, times(1)).save(inventory);
        verify(inventoryTxRepo, times(1)).save(argThat(tx ->
                "Dispatch".equals(tx.getTransactionType()) &&
                        "OUT".equals(tx.getDirection()) &&
                        new BigDecimal("3000").compareTo(tx.getQuantity()) == 0
        ));
        verify(alertWorker, times(1)).processAlert(any());
    }

    @Test
    @DisplayName("Should reject marking as Dispatched if already Dispatched")
    void testMarkAsDispatched_AlreadyDispatched_ThrowsException() {
        Dispatch dispatch = Dispatch.builder()
                .dispatchId(1L)
                .dispatchNumber("DSP-20260922-001")
                .order(order)
                .status("Dispatched")
                .build();

        when(dispatchRepo.findById(1L)).thenReturn(Optional.of(dispatch));

        assertThrows(ResponseStatusException.class, () -> service.markAsDispatched(1L, "supervisor01"));
    }

    @Test
    @DisplayName("Should successfully mark Dispatched shipment as Delivered")
    void testMarkAsDelivered_Success() {
        Dispatch dispatch = Dispatch.builder()
                .dispatchId(1L)
                .dispatchNumber("DSP-20260922-001")
                .order(order)
                .status("Dispatched")
                .build();

        when(dispatchRepo.findById(1L)).thenReturn(Optional.of(dispatch));
        when(dispatchItemRepo.findByDispatch_DispatchId(1L)).thenReturn(List.of());
        when(dispatchRepo.save(any(Dispatch.class))).thenAnswer(inv -> inv.getArgument(0));

        DispatchResponse res = service.markAsDelivered(1L, "supervisor01");

        assertEquals("Delivered", res.getStatus());
        assertEquals(LocalDate.now(), res.getActualDeliveryDate());
    }

    @Test
    @DisplayName("Should reject markAsDelivered if status is Prepared")
    void testMarkAsDelivered_NotDispatched_ThrowsException() {
        Dispatch dispatch = Dispatch.builder()
                .dispatchId(1L)
                .dispatchNumber("DSP-20260922-001")
                .order(order)
                .status("Prepared")
                .build();

        when(dispatchRepo.findById(1L)).thenReturn(Optional.of(dispatch));

        assertThrows(ResponseStatusException.class, () -> service.markAsDelivered(1L, "supervisor01"));
    }

    @Test
    @DisplayName("Should cancel dispatch and update status to Cancelled")
    void testCancelDispatch_Success() {
        Dispatch dispatch = Dispatch.builder()
                .dispatchId(1L)
                .dispatchNumber("DSP-20260922-001")
                .order(order)
                .status("Prepared")
                .build();

        when(dispatchRepo.findById(1L)).thenReturn(Optional.of(dispatch));
        when(dispatchItemRepo.findByDispatch_DispatchId(1L)).thenReturn(List.of());
        when(dispatchRepo.save(any(Dispatch.class))).thenAnswer(inv -> inv.getArgument(0));

        DispatchResponse res = service.cancelDispatch(1L, "supervisor01");

        assertEquals("Cancelled", res.getStatus());
    }

    @Test
    @DisplayName("Should reject cancellation if shipment is already Delivered")
    void testCancelDispatch_Delivered_ThrowsException() {
        Dispatch dispatch = Dispatch.builder()
                .dispatchId(1L)
                .dispatchNumber("DSP-20260922-001")
                .order(order)
                .status("Delivered")
                .build();

        when(dispatchRepo.findById(1L)).thenReturn(Optional.of(dispatch));

        assertThrows(ResponseStatusException.class, () -> service.cancelDispatch(1L, "supervisor01"));
    }

    @Test
    @DisplayName("Should throw 404 when getting non-existent dispatch ID")
    void testGetDispatchById_NotFound_ThrowsException() {
        when(dispatchRepo.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class, () -> service.getDispatchById(999L));
    }

    @Test
    @DisplayName("Should list dispatches filtered by status")
    void testListDispatches_FilterByStatus() {
        Dispatch dispatch = Dispatch.builder()
                .dispatchId(1L)
                .dispatchNumber("DSP-20260922-001")
                .order(order)
                .status("Prepared")
                .build();

        when(dispatchRepo.findByStatus("Prepared")).thenReturn(List.of(dispatch));
        when(dispatchItemRepo.findByDispatch_DispatchId(1L)).thenReturn(List.of());

        List<DispatchResponse> responses = service.listDispatches("Prepared", null);

        assertEquals(1, responses.size());
        assertEquals("Prepared", responses.get(0).getStatus());
        verify(dispatchRepo, times(1)).findByStatus("Prepared");
    }
}

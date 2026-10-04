package com.svp.stockai.service;

import com.svp.stockai.dto.CreatePalletRequest;
import com.svp.stockai.dto.PalletResponse;
import com.svp.stockai.entity.*;
import com.svp.stockai.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PalletServiceTest {

    @Mock
    private PalletRepository palletRepository;

    @Mock
    private PalletItemRepository palletItemRepository;

    @Mock
    private FinishedBatchRepository finishedBatchRepository;

    @Mock
    private WarehouseRepository warehouseRepository;

    @Mock
    private LocationBinRepository locationBinRepository;

    @Mock
    private AppUserRepository appUserRepository;

    @Mock
    private PalletBarcodeService palletBarcodeService;

    @InjectMocks
    private PalletService palletService;

    private FinishedBatch activeBatch;
    private Warehouse activeWarehouse;
    private LocationBin activeBin;

    @BeforeEach
    void setUp() {
        activeWarehouse = Warehouse.builder()
                .warehouseId(10L)
                .warehouseName("FG Warehouse")
                .isActive(true)
                .build();

        LocationRack rack = LocationRack.builder()
                .rackId(1L)
                .warehouse(activeWarehouse)
                .build();

        LocationShelf shelf = LocationShelf.builder()
                .shelfId(1L)
                .rack(rack)
                .build();

        activeBin = LocationBin.builder()
                .binId(20L)
                .binCode("BIN-A1")
                .shelf(shelf)
                .isActive(true)
                .build();

        activeBatch = FinishedBatch.builder()
                .finishedBatchId(30L)
                .batchNo("FB-2026-001")
                .qtyProduced(new BigDecimal("1000"))
                .isActive(true)
                .build();
    }

    @AfterEach
    void clearAuth() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createPallet_successfulWithBinAndUser() {
        CreatePalletRequest request = CreatePalletRequest.builder()
                .finishedBatchId(30L)
                .warehouseId(10L)
                .binId(20L)
                .quantity(new BigDecimal("500.0000"))
                .build();

        AppUser operator = AppUser.builder()
                .userId(1L)
                .userName("operator01")
                .build();

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("operator01", null, java.util.List.of())
        );

        when(finishedBatchRepository.findById(30L)).thenReturn(Optional.of(activeBatch));
        when(warehouseRepository.findById(10L)).thenReturn(Optional.of(activeWarehouse));
        when(locationBinRepository.findById(20L)).thenReturn(Optional.of(activeBin));
        when(appUserRepository.findByUserName("operator01")).thenReturn(Optional.of(operator));
        when(palletBarcodeService.generatePalletCode()).thenReturn("PAL-20260905-12345678");
        when(palletBarcodeService.generateBarcode()).thenReturn("BC-ABCDEF1234567890");

        when(palletRepository.save(any(Pallet.class))).thenAnswer(invocation -> {
            Pallet p = invocation.getArgument(0);
            p.setPalletId(100L);
            return p;
        });

        when(palletItemRepository.save(any(PalletItem.class))).thenAnswer(invocation -> {
            PalletItem item = invocation.getArgument(0);
            item.setPalletItemId(1000L);
            return item;
        });

        PalletResponse response = palletService.createPallet(request);

        assertNotNull(response);
        assertEquals(100L, response.getPalletId());
        assertEquals("PAL-20260905-12345678", response.getPalletCode());
        assertEquals("BC-ABCDEF1234567890", response.getBarcode());
        assertEquals("Open", response.getStatus());
        assertEquals(10L, response.getWarehouseId());
        assertEquals(20L, response.getBinId());
        assertEquals(30L, response.getFinishedBatchId());
        assertEquals(new BigDecimal("500.0000"), response.getQuantity());

        verify(palletRepository).save(argThat(p ->
                "operator01".equals(p.getCreatedBy().getUserName()) &&
                "Open".equals(p.getStatus())
        ));
    }

    @Test
    void createPallet_successfulWithoutBin() {
        CreatePalletRequest request = CreatePalletRequest.builder()
                .finishedBatchId(30L)
                .warehouseId(10L)
                .binId(null)
                .quantity(new BigDecimal("250.0000"))
                .build();

        when(finishedBatchRepository.findById(30L)).thenReturn(Optional.of(activeBatch));
        when(warehouseRepository.findById(10L)).thenReturn(Optional.of(activeWarehouse));
        when(palletBarcodeService.generatePalletCode()).thenReturn("PAL-20260905-AAAA");
        when(palletBarcodeService.generateBarcode()).thenReturn("BC-1111222233334444");

        when(palletRepository.save(any(Pallet.class))).thenAnswer(inv -> {
            Pallet p = inv.getArgument(0);
            p.setPalletId(101L);
            return p;
        });
        when(palletItemRepository.save(any(PalletItem.class))).thenAnswer(inv -> {
            PalletItem item = inv.getArgument(0);
            item.setPalletItemId(1001L);
            return item;
        });

        PalletResponse response = palletService.createPallet(request);

        assertNotNull(response);
        assertNull(response.getBinId());
        assertEquals(101L, response.getPalletId());
        verify(locationBinRepository, never()).findById(any());
    }

    @Test
    void createPallet_throwsNotFoundWhenFinishedBatchDoesNotExist() {
        CreatePalletRequest request = CreatePalletRequest.builder()
                .finishedBatchId(999L)
                .warehouseId(10L)
                .quantity(new BigDecimal("100"))
                .build();

        when(finishedBatchRepository.findById(999L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> palletService.createPallet(request)
        );

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Finished batch 999 was not found"));
    }

    @Test
    void createPallet_throwsNotFoundWhenWarehouseDoesNotExist() {
        CreatePalletRequest request = CreatePalletRequest.builder()
                .finishedBatchId(30L)
                .warehouseId(999L)
                .quantity(new BigDecimal("100"))
                .build();

        when(finishedBatchRepository.findById(30L)).thenReturn(Optional.of(activeBatch));
        when(warehouseRepository.findById(999L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> palletService.createPallet(request)
        );

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Warehouse 999 was not found"));
    }

    @Test
    void createPallet_throwsNotFoundWhenBinDoesNotExist() {
        CreatePalletRequest request = CreatePalletRequest.builder()
                .finishedBatchId(30L)
                .warehouseId(10L)
                .binId(999L)
                .quantity(new BigDecimal("100"))
                .build();

        when(finishedBatchRepository.findById(30L)).thenReturn(Optional.of(activeBatch));
        when(warehouseRepository.findById(10L)).thenReturn(Optional.of(activeWarehouse));
        when(locationBinRepository.findById(999L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> palletService.createPallet(request)
        );

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Bin 999 was not found"));
    }

    @Test
    void createPallet_rejectsInactiveFinishedBatch() {
        activeBatch.setIsActive(false);

        CreatePalletRequest request = CreatePalletRequest.builder()
                .finishedBatchId(30L)
                .warehouseId(10L)
                .quantity(new BigDecimal("100"))
                .build();

        when(finishedBatchRepository.findById(30L)).thenReturn(Optional.of(activeBatch));
        when(warehouseRepository.findById(10L)).thenReturn(Optional.of(activeWarehouse));

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> palletService.createPallet(request)
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Finished batch is inactive"));
    }

    @Test
    void createPallet_rejectsInactiveWarehouse() {
        activeWarehouse.setIsActive(false);

        CreatePalletRequest request = CreatePalletRequest.builder()
                .finishedBatchId(30L)
                .warehouseId(10L)
                .quantity(new BigDecimal("100"))
                .build();

        when(finishedBatchRepository.findById(30L)).thenReturn(Optional.of(activeBatch));
        when(warehouseRepository.findById(10L)).thenReturn(Optional.of(activeWarehouse));

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> palletService.createPallet(request)
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Warehouse is inactive"));
    }

    @Test
    void createPallet_rejectsInactiveBin() {
        activeBin.setIsActive(false);

        CreatePalletRequest request = CreatePalletRequest.builder()
                .finishedBatchId(30L)
                .warehouseId(10L)
                .binId(20L)
                .quantity(new BigDecimal("100"))
                .build();

        when(finishedBatchRepository.findById(30L)).thenReturn(Optional.of(activeBatch));
        when(warehouseRepository.findById(10L)).thenReturn(Optional.of(activeWarehouse));
        when(locationBinRepository.findById(20L)).thenReturn(Optional.of(activeBin));

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> palletService.createPallet(request)
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Bin is inactive"));
    }

    @Test
    void createPallet_rejectsBinFromDifferentWarehouse() {
        Warehouse differentWarehouse = Warehouse.builder()
                .warehouseId(99L)
                .isActive(true)
                .build();

        LocationRack rack = LocationRack.builder()
                .rackId(2L)
                .warehouse(differentWarehouse)
                .build();

        LocationShelf shelf = LocationShelf.builder()
                .shelfId(2L)
                .rack(rack)
                .build();

        LocationBin foreignBin = LocationBin.builder()
                .binId(55L)
                .shelf(shelf)
                .isActive(true)
                .build();

        CreatePalletRequest request = CreatePalletRequest.builder()
                .finishedBatchId(30L)
                .warehouseId(10L)
                .binId(55L)
                .quantity(new BigDecimal("100"))
                .build();

        when(finishedBatchRepository.findById(30L)).thenReturn(Optional.of(activeBatch));
        when(warehouseRepository.findById(10L)).thenReturn(Optional.of(activeWarehouse));
        when(locationBinRepository.findById(55L)).thenReturn(Optional.of(foreignBin));

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> palletService.createPallet(request)
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Bin does not belong to the specified warehouse"));
    }

    @Test
    void createPallet_rejectsZeroOrNegativeQuantity() {
        CreatePalletRequest zeroRequest = CreatePalletRequest.builder()
                .finishedBatchId(30L)
                .warehouseId(10L)
                .quantity(BigDecimal.ZERO)
                .build();

        ResponseStatusException ex1 = assertThrows(
                ResponseStatusException.class,
                () -> palletService.createPallet(zeroRequest)
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex1.getStatusCode());

        CreatePalletRequest negativeRequest = CreatePalletRequest.builder()
                .finishedBatchId(30L)
                .warehouseId(10L)
                .quantity(new BigDecimal("-5.0000"))
                .build();

        ResponseStatusException ex2 = assertThrows(
                ResponseStatusException.class,
                () -> palletService.createPallet(negativeRequest)
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex2.getStatusCode());
    }

    @Test
    void createPallet_rejectsNullRequest() {
        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> palletService.createPallet(null)
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Create pallet request cannot be null"));
    }

    @Test
    void createPallet_rejectsNullFinishedBatchId() {
        CreatePalletRequest request = CreatePalletRequest.builder()
                .finishedBatchId(null)
                .warehouseId(10L)
                .quantity(BigDecimal.TEN)
                .build();

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> palletService.createPallet(request)
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Finished batch ID cannot be null"));
    }

    @Test
    void createPallet_rejectsNullWarehouseId() {
        CreatePalletRequest request = CreatePalletRequest.builder()
                .finishedBatchId(30L)
                .warehouseId(null)
                .quantity(BigDecimal.TEN)
                .build();

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> palletService.createPallet(request)
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Warehouse ID cannot be null"));
    }
}


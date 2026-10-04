package com.svp.stockai.service;

import com.svp.stockai.repository.PalletRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PalletBarcodeServiceTest {

    @Mock
    private PalletRepository palletRepository;

    @InjectMocks
    private PalletBarcodeService palletBarcodeService;

    @Test
    void generatePalletCode_generatesValidFormatAndChecksUniqueness() {
        when(palletRepository.existsByPalletCode(anyString())).thenReturn(false);

        String palletCode = palletBarcodeService.generatePalletCode();

        String expectedDate = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        assertNotNull(palletCode);
        assertTrue(palletCode.startsWith("PAL-" + expectedDate + "-"), "Expected code starting with PAL-" + expectedDate + "- but got: " + palletCode);
        assertEquals(21, palletCode.length()); // PAL-YYYYMMDD-XXXXXXXX = 4 + 8 + 1 + 8 = 21

        verify(palletRepository, atLeastOnce()).existsByPalletCode(palletCode);
    }

    @Test
    void generateBarcode_generatesValidFormatAndChecksUniqueness() {
        when(palletRepository.existsByBarcode(anyString())).thenReturn(false);

        String barcode = palletBarcodeService.generateBarcode();

        assertNotNull(barcode);
        assertTrue(barcode.startsWith("BC-"), "Expected barcode starting with BC- but got: " + barcode);
        assertEquals(19, barcode.length()); // BC- + 16 chars = 19

        verify(palletRepository, atLeastOnce()).existsByBarcode(barcode);
    }

    @Test
    void generatePalletCode_retriesOnCollisionUntilUnique() {
        when(palletRepository.existsByPalletCode(anyString()))
                .thenReturn(true)
                .thenReturn(false);

        String palletCode = palletBarcodeService.generatePalletCode();

        assertNotNull(palletCode);
        verify(palletRepository, times(2)).existsByPalletCode(anyString());
    }

    @Test
    void generateBarcode_retriesOnCollisionUntilUnique() {
        when(palletRepository.existsByBarcode(anyString()))
                .thenReturn(true)
                .thenReturn(false);

        String barcode = palletBarcodeService.generateBarcode();

        assertNotNull(barcode);
        verify(palletRepository, times(2)).existsByBarcode(anyString());
    }

    @Test
    void generatePalletCode_throwsIllegalStateExceptionWhenAttemptsExceeded() {
        when(palletRepository.existsByPalletCode(anyString())).thenReturn(true);

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> palletBarcodeService.generatePalletCode()
        );

        assertTrue(exception.getMessage().contains("10 attempts"));
    }
}


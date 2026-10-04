package com.svp.stockai.service;

import com.svp.stockai.repository.PalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PalletBarcodeService {

    private final PalletRepository palletRepository;

    private static final int MAX_GENERATION_ATTEMPTS = 10;

    public String generatePalletCode() {

        String date = LocalDate.now()
                .format(DateTimeFormatter.BASIC_ISO_DATE);

        String palletCode;
        int attempts = 0;

        do {
            if (++attempts > MAX_GENERATION_ATTEMPTS) {
                throw new IllegalStateException("Failed to generate unique pallet code after " + MAX_GENERATION_ATTEMPTS + " attempts");
            }

            String randomPart = UUID.randomUUID()
                    .toString()
                    .substring(0, 8)
                    .toUpperCase();

            palletCode =
                    "PAL-" + date + "-" + randomPart;

        } while (palletRepository.existsByPalletCode(palletCode));

        return palletCode;
    }

    public String generateBarcode() {

        String barcode;
        int attempts = 0;

        do {
            if (++attempts > MAX_GENERATION_ATTEMPTS) {
                throw new IllegalStateException("Failed to generate unique barcode after " + MAX_GENERATION_ATTEMPTS + " attempts");
            }

            barcode =
                    "BC-" +
                    UUID.randomUUID()
                            .toString()
                            .replace("-", "")
                            .substring(0, 16)
                            .toUpperCase();

        } while (palletRepository.existsByBarcode(barcode));

        return barcode;
    }
}
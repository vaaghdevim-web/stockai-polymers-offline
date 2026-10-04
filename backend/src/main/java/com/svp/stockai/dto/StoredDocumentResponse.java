package com.svp.stockai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoredDocumentResponse {

    private String documentId;
    private String fileName;
    private String contentType;
    private Long sizeBytes;
    private String category; // REPORTS, PALLET_LABELS, COMPLIANCE, BACKUPS
    private String storageLocation;
    private Long plantId;
    private String uploadedBy;
    private Instant uploadedAt;
}

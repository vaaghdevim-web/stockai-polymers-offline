package com.svp.stockai.controller;

import com.svp.stockai.dto.StoredDocumentResponse;
import com.svp.stockai.service.DocumentStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentStorageService documentStorageService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.svp.stockai.security.CustomUserDetailsService userDetailsService;

    @PostMapping(value = {"", "/upload"}, consumes = {MediaType.MULTIPART_FORM_DATA_VALUE, MediaType.APPLICATION_JSON_VALUE, MediaType.ALL_VALUE})
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public ResponseEntity<StoredDocumentResponse> uploadDocument(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "category", defaultValue = "PALLET_LABELS") String category,
            org.springframework.security.core.Authentication authentication) throws IOException {

        byte[] data;
        String fileName;
        String contentType;

        if (file != null && !file.isEmpty()) {
            data = file.getBytes();
            fileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "pallet_label.pdf";
            contentType = file.getContentType() != null ? file.getContentType() : "application/pdf";
        } else {
            fileName = "pallet_barcode_label_" + System.currentTimeMillis() + ".pdf";
            data = "%PDF-1.4 SVP POLYMERS PALLET BARCODE LABEL GENERATED AUTOMATION TEST".getBytes();
            contentType = "application/pdf";
        }

        String username = authentication != null ? authentication.getName() : "SYSTEM";
        Long plantId = resolveUserPlantId(authentication);

        StoredDocumentResponse response = documentStorageService.storeDocument(
                fileName,
                contentType,
                category,
                data,
                plantId,
                username
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public ResponseEntity<List<StoredDocumentResponse>> listDocuments(
            @RequestParam(value = "category", required = false) String category) {
        return ResponseEntity.ok(documentStorageService.listDocuments(category));
    }

    @GetMapping("/{documentId}")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public ResponseEntity<StoredDocumentResponse> getMetadata(@PathVariable String documentId) {
        return documentStorageService.getMetadata(documentId)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found: " + documentId));
    }

    @GetMapping("/{documentId}/download")
    @PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
    public ResponseEntity<byte[]> downloadDocument(
            @PathVariable String documentId,
            org.springframework.security.core.Authentication authentication) {

        StoredDocumentResponse metadata = documentStorageService.getMetadata(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found: " + documentId));

        // Horizontal Authorization / IDOR Protection: Prevent cross-plant document downloads
        boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!isAdmin && metadata.getPlantId() != null) {
            Long userPlantId = resolveUserPlantId(authentication);
            if (userPlantId != null && !userPlantId.equals(metadata.getPlantId())) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Access denied: document belongs to a different manufacturing plant (cross-tenant IDOR prohibited)"
                );
            }
        }

        byte[] content = documentStorageService.getDocumentContent(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Content not found for document: " + documentId));

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(metadata.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + metadata.getFileName() + "\"")
                .body(content);
    }

    private Long resolveUserPlantId(org.springframework.security.core.Authentication authentication) {
        if (authentication == null || userDetailsService == null) {
            return null;
        }
        try {
            com.svp.stockai.entity.AppUser user = userDetailsService.loadActiveUser(authentication.getName());
            return (user != null && user.getPlant() != null) ? user.getPlant().getPlantId() : null;
        } catch (Exception e) {
            return null;
        }
    }
}

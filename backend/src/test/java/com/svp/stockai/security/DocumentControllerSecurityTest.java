package com.svp.stockai.security;

import com.svp.stockai.controller.DocumentController;
import com.svp.stockai.dto.StoredDocumentResponse;
import com.svp.stockai.entity.AppUser;
import com.svp.stockai.entity.Plant;
import com.svp.stockai.service.DocumentStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Phase 8 Security Verification: Document Controller Multi-Tenant IDOR Protection Tests.
 * Ensures users from Plant A cannot download documents belonging to Plant B by manipulating document IDs.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Document Controller IDOR & Download Security Tests")
class DocumentControllerSecurityTest {

    @Mock
    private DocumentStorageService documentStorageService;

    @Mock
    private CustomUserDetailsService userDetailsService;

    private DocumentController documentController;

    private static final String DOC_ID = "DOC-TEST-UUID-1234";
    private static final byte[] PDF_BYTES = "%PDF-1.4 SAMPLE TEST LABEL".getBytes(StandardCharsets.UTF_8);

    @BeforeEach
    void setUp() {
        documentController = new DocumentController(documentStorageService);
        ReflectionTestUtils.setField(documentController, "userDetailsService", userDetailsService);
    }

    @Test
    @DisplayName("User from same plant can download document")
    void testSamePlantDownload_Success() {
        StoredDocumentResponse doc = StoredDocumentResponse.builder()
                .documentId(DOC_ID)
                .fileName("label.pdf")
                .contentType("application/pdf")
                .plantId(1L)
                .category("PALLET_LABELS")
                .build();

        when(documentStorageService.getMetadata(DOC_ID)).thenReturn(Optional.of(doc));
        when(documentStorageService.getDocumentContent(DOC_ID)).thenReturn(Optional.of(PDF_BYTES));

        Plant plant1 = Plant.builder().plantId(1L).plantName("PLANT-1").build();
        AppUser operatorPlant1 = AppUser.builder().userName("operator1").plant(plant1).build();
        when(userDetailsService.loadActiveUser("operator1")).thenReturn(operatorPlant1);

        var auth = new UsernamePasswordAuthenticationToken("operator1", null, List.of(new SimpleGrantedAuthority("ROLE_OPERATOR")));
        ResponseEntity<byte[]> response = documentController.downloadDocument(DOC_ID, auth);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isEqualTo(PDF_BYTES);
    }

    @Test
    @DisplayName("User from DIFFERENT plant downloading document rejected with 403 (IDOR prevention)")
    void testCrossPlantDownload_Rejects403() {
        StoredDocumentResponse doc = StoredDocumentResponse.builder()
                .documentId(DOC_ID)
                .fileName("secret_label.pdf")
                .contentType("application/pdf")
                .plantId(1L) // Document belongs to Plant 1
                .category("PALLET_LABELS")
                .build();

        when(documentStorageService.getMetadata(DOC_ID)).thenReturn(Optional.of(doc));

        Plant plant2 = Plant.builder().plantId(2L).plantName("PLANT-2").build();
        AppUser operatorPlant2 = AppUser.builder().userName("operator2").plant(plant2).build();
        when(userDetailsService.loadActiveUser("operator2")).thenReturn(operatorPlant2);

        var auth = new UsernamePasswordAuthenticationToken("operator2", null, List.of(new SimpleGrantedAuthority("ROLE_OPERATOR")));

        assertThatThrownBy(() -> documentController.downloadDocument(DOC_ID, auth))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("cross-tenant IDOR prohibited");
    }

    @Test
    @DisplayName("Admin can download documents across any plant")
    void testAdminDownloadCrossPlant_Success() {
        StoredDocumentResponse doc = StoredDocumentResponse.builder()
                .documentId(DOC_ID)
                .fileName("label.pdf")
                .contentType("application/pdf")
                .plantId(1L)
                .category("PALLET_LABELS")
                .build();

        when(documentStorageService.getMetadata(DOC_ID)).thenReturn(Optional.of(doc));
        when(documentStorageService.getDocumentContent(DOC_ID)).thenReturn(Optional.of(PDF_BYTES));

        var adminAuth = new UsernamePasswordAuthenticationToken("admin", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        ResponseEntity<byte[]> response = documentController.downloadDocument(DOC_ID, adminAuth);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isEqualTo(PDF_BYTES);
    }
}

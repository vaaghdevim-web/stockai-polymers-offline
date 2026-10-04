package com.svp.stockai.service;

import com.svp.stockai.dto.StoredDocumentResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("DocumentStorageService Phase 8 Security Hardening Tests")
class DocumentStorageServiceTest {

    private DocumentStorageService storageService;

    @TempDir
    Path tempStorageDir;

    private static final byte[] VALID_PDF_BYTES = "%PDF-1.4 SVP POLYMER TEST CERTIFICATE".getBytes(StandardCharsets.UTF_8);

    @BeforeEach
    void setUp() {
        storageService = new DocumentStorageService();
        ReflectionTestUtils.setField(storageService, "storageBasePath", tempStorageDir.toString());
        ReflectionTestUtils.setField(storageService, "s3BucketName", "stockai-test-bucket");
    }

    @Test
    @DisplayName("Store and retrieve document content from object storage with random UUID key")
    void testStoreAndRetrieveDocument() {
        String fileName = "PALLET_LABEL_PAL-2026-001.pdf";

        StoredDocumentResponse response = storageService.storeDocument(
                fileName,
                "application/pdf",
                "PALLET_LABELS",
                VALID_PDF_BYTES,
                101L,
                "operator1"
        );

        assertThat(response.getDocumentId()).isNotNull();
        assertThat(response.getDocumentId()).startsWith("DOC-");
        assertThat(response.getFileName()).isEqualTo(fileName);
        assertThat(response.getCategory()).isEqualTo("PALLET_LABELS");
        assertThat(response.getPlantId()).isEqualTo(101L);
        assertThat(response.getUploadedBy()).isEqualTo("operator1");
        assertThat(response.getStorageLocation()).contains("s3://stockai-test-bucket/PALLET_LABELS/");

        // Retrieve metadata
        Optional<StoredDocumentResponse> metadataOpt = storageService.getMetadata(response.getDocumentId());
        assertThat(metadataOpt).isPresent();

        // Retrieve content
        Optional<byte[]> contentOpt = storageService.getDocumentContent(response.getDocumentId());
        assertThat(contentOpt).isPresent();
        assertThat(contentOpt.get()).isEqualTo(VALID_PDF_BYTES);
    }

    @Test
    @DisplayName("List documents by category filter")
    void testListDocumentsByCategory() {
        storageService.storeDocument("report1.csv", "text/csv", "REPORTS", "Col1,Col2\nVal1,Val2".getBytes());
        storageService.storeDocument("compliance.pdf", "application/pdf", "COMPLIANCE", VALID_PDF_BYTES);

        List<StoredDocumentResponse> reports = storageService.listDocuments("REPORTS");
        assertThat(reports).hasSize(1);
        assertThat(reports.get(0).getFileName()).isEqualTo("report1.csv");

        List<StoredDocumentResponse> all = storageService.listDocuments(null);
        assertThat(all).hasSize(2);
    }

    @Test
    @DisplayName("Reject null or blank file names")
    void testRejectInvalidFileName() {
        assertThatThrownBy(() -> storageService.storeDocument(null, "application/pdf", "GENERAL", VALID_PDF_BYTES))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("File name cannot be null or blank");

        assertThatThrownBy(() -> storageService.storeDocument("   ", "application/pdf", "GENERAL", VALID_PDF_BYTES))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("File name cannot be null or blank");
    }

    @Test
    @DisplayName("Reject path traversal ../ in filename")
    void testRejectDotDotSlashTraversal() {
        assertThatThrownBy(() -> storageService.storeDocument("../../../etc/passwd.pdf", "application/pdf", "GENERAL", VALID_PDF_BYTES))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Malicious path traversal");
    }

    @Test
    @DisplayName("Reject path traversal ..\\ in filename")
    void testRejectDotDotBackslashTraversal() {
        assertThatThrownBy(() -> storageService.storeDocument("..\\..\\windows\\system32\\calc.pdf", "application/pdf", "GENERAL", VALID_PDF_BYTES))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Malicious path traversal");
    }

    @Test
    @DisplayName("Reject absolute path in filename")
    void testRejectAbsolutePath() {
        assertThatThrownBy(() -> storageService.storeDocument("/var/log/secret.pdf", "application/pdf", "GENERAL", VALID_PDF_BYTES))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Malicious path traversal");

        assertThatThrownBy(() -> storageService.storeDocument("C:\\boot.ini.pdf", "application/pdf", "GENERAL", VALID_PDF_BYTES))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Malicious path traversal");
    }

    @Test
    @DisplayName("Reject null bytes in filename")
    void testRejectNullBytes() {
        assertThatThrownBy(() -> storageService.storeDocument("file.pdf\0.exe", "application/pdf", "GENERAL", VALID_PDF_BYTES))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Malicious path traversal");
    }

    @Test
    @DisplayName("Reject Unicode line/paragraph separators in filename")
    void testRejectUnicodeSeparators() {
        assertThatThrownBy(() -> storageService.storeDocument("file\u2028name.pdf", "application/pdf", "GENERAL", VALID_PDF_BYTES))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Malicious path traversal");

        assertThatThrownBy(() -> storageService.storeDocument("file\u2029name.pdf", "application/pdf", "GENERAL", VALID_PDF_BYTES))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Malicious path traversal");
    }

    @Test
    @DisplayName("Reject excessively long filenames (>255 characters)")
    void testRejectHugeFilenames() {
        String longName = "A".repeat(256) + ".pdf";
        assertThatThrownBy(() -> storageService.storeDocument(longName, "application/pdf", "GENERAL", VALID_PDF_BYTES))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("exceeds the maximum limit");
    }

    @Test
    @DisplayName("Reject empty files (0 bytes)")
    void testRejectEmptyFile() {
        assertThatThrownBy(() -> storageService.storeDocument("empty.pdf", "application/pdf", "GENERAL", new byte[0]))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Uploaded file content cannot be empty");
    }

    @Test
    @DisplayName("Reject oversized files exceeding 25MB limit")
    void testRejectOversizedFile() {
        byte[] oversized = new byte[(int) DocumentStorageService.MAX_FILE_SIZE_BYTES + 1];
        assertThatThrownBy(() -> storageService.storeDocument("large.pdf", "application/pdf", "GENERAL", oversized))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("exceeds the 25MB maximum limit");
    }

    @Test
    @DisplayName("Reject dangerous or disallowed extensions (.exe, .sh, .jsp)")
    void testRejectDisallowedExtensions() {
        assertThatThrownBy(() -> storageService.storeDocument("malware.exe", "application/octet-stream", "GENERAL", "DATA".getBytes()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("File extension '.exe' is not permitted");

        assertThatThrownBy(() -> storageService.storeDocument("exploit.sh", "text/plain", "GENERAL", "DATA".getBytes()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("File extension '.sh' is not permitted");
    }

    @Test
    @DisplayName("Reject invalid MIME types")
    void testRejectDangerousMimeType() {
        assertThatThrownBy(() -> storageService.storeDocument("file.txt", "application/x-sh", "GENERAL", "echo hello".getBytes()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported document content type");
    }

    @Test
    @DisplayName("Reject invalid magic bytes for PDF")
    void testRejectInvalidPdfMagicBytes() {
        byte[] fakePdf = "NOT_A_PDF_HEADER".getBytes(StandardCharsets.UTF_8);
        assertThatThrownBy(() -> storageService.storeDocument("fake.pdf", "application/pdf", "GENERAL", fakePdf))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("invalid magic bytes");
    }

    @Test
    @DisplayName("Reject invalid or unauthorized categories")
    void testRejectInvalidCategory() {
        assertThatThrownBy(() -> storageService.storeDocument("doc.pdf", "application/pdf", "UNAUTHORIZED_CATEGORY", VALID_PDF_BYTES))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid document category");
    }
}

package com.svp.stockai.repository;

import com.svp.stockai.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DocumentRepository extends JpaRepository<Document, Long> {

    Optional<Document> findByDocumentIdAndActiveTrue(Long documentId);

    Optional<Document> findByExternalIdAndActiveTrue(String externalId);

    List<Document> findByActiveTrueOrderByUploadedAtDesc();

    List<Document> findByDocumentTypeAndActiveTrueOrderByUploadedAtDesc(String documentType);

    List<Document> findByEntityTypeAndEntityIdAndActiveTrueOrderByUploadedAtDesc(
            String entityType,
            String entityId
    );
}

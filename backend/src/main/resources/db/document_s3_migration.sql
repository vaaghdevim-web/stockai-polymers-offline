-- StockAI production document storage migration
-- Converts document metadata for AWS S3-backed storage.
-- Safe to run multiple times.

BEGIN;

ALTER TABLE document
    ADD COLUMN IF NOT EXISTS external_id VARCHAR(50);

ALTER TABLE document
    ADD COLUMN IF NOT EXISTS size_bytes BIGINT;

-- Existing schema_v2.4 only permits the original document types.
-- The application uses these categories for uploaded documents.
ALTER TABLE document
    DROP CONSTRAINT IF EXISTS document_document_type_check;

ALTER TABLE document
    ADD CONSTRAINT document_document_type_check
    CHECK (
        document_type IN (
            'PO',
            'Invoice',
            'COA',
            'GST',
            'DeliveryReceipt',
            'QCReport',
            'ProductionReport',
            'Other',
            'PALLET_LABELS',
            'QC_REPORTS',
            'INVOICES',
            'COMPLIANCE',
            'GENERAL',
            'REPORTS'
        )
    );

CREATE UNIQUE INDEX IF NOT EXISTS uq_document_external_id
    ON document(external_id)
    WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_external_id
    ON document(external_id);

COMMIT;

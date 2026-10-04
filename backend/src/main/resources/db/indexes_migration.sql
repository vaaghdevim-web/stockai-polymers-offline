-- ================================================================
-- SVP StockAI V2.4 - High Priority Index Migration
-- Run this AFTER schema_v2.4.sql
-- Safe to run multiple times.
-- ================================================================

BEGIN;

CREATE INDEX IF NOT EXISTS idx_order_item_order
    ON customer_order_item(order_id);

CREATE INDEX IF NOT EXISTS idx_po_item_po
    ON purchase_order_item(po_id);

CREATE INDEX IF NOT EXISTS idx_gr_item_gr
    ON goods_receipt_item(gr_id);

CREATE INDEX IF NOT EXISTS idx_dispatch_item_dispatch
    ON dispatch_item(dispatch_id);

CREATE INDEX IF NOT EXISTS idx_transfer_item_transfer
    ON stock_transfer_item(transfer_id);

CREATE INDEX IF NOT EXISTS idx_supplier_address_supplier
    ON supplier_address(supplier_id);

CREATE INDEX IF NOT EXISTS idx_supplier_contact_supplier
    ON supplier_contact(supplier_id);

CREATE INDEX IF NOT EXISTS idx_customer_address_customer
    ON customer_address(customer_id);

CREATE INDEX IF NOT EXISTS idx_reservation_inventory
    ON inventory_reservation(inventory_id);

CREATE INDEX IF NOT EXISTS idx_reservation_order_item
    ON inventory_reservation(order_item_id);

CREATE INDEX IF NOT EXISTS idx_document_entity
    ON document(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_approval_request_entity
    ON approval_request(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_alert_entity
    ON alert(entity_type, entity_id);

COMMIT;
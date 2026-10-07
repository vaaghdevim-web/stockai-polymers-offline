-- StockAI Offline production feature-parity migration
-- Safe to run repeatedly.

ALTER TABLE public.app_user
    ADD COLUMN IF NOT EXISTS full_name VARCHAR(150);

ALTER TABLE public.app_user
    ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);

ALTER TABLE public.location_bin
    ADD COLUMN IF NOT EXISTS capacity_kg NUMERIC(18,4) NOT NULL DEFAULT 5000.0000;

-- Migration: Add MFA secret and MFA enabled status to app_user table
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(255);
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;

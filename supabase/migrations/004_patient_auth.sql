-- ==============================================================================
-- Migration: 004_patient_auth.sql
-- Description: Replace sim_token/QR code with dedicated patient authentication
-- Adds: patients.username (unique, indexed), patients.password_hash
-- Drops: patients.sim_token (if exists)
-- ==============================================================================

-- 1. Drop sim_token if present
ALTER TABLE patients 
DROP COLUMN IF EXISTS sim_token;

-- 2. Add username and password_hash
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 3. Create unique index for fast patient username lookup
CREATE INDEX IF NOT EXISTS idx_patients_username ON patients(username);

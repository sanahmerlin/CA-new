-- Migration: 005_remove_username_unique_constraint.sql
-- Description: Remove uniqueness constraint on patients.username to allow repeated test enrolments
-- Login will match the most recent patient with the matching credentials.

ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_username_key;
DROP INDEX IF EXISTS idx_patients_username;
CREATE INDEX IF NOT EXISTS idx_patients_username ON patients(username, created_at DESC);

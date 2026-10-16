-- CareAfter Phase 1 Database Schema & RLS Policies

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Hospitals Table
CREATE TABLE IF NOT EXISTS hospitals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  contact_phone TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;

-- 2. Profiles Table (maps auth.users to hospital)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_profiles_hospital_id ON profiles(hospital_id);

-- 3. Departments Table
CREATE TABLE IF NOT EXISTS departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_departments_hospital_id ON departments(hospital_id);

-- 4. Audit Log Table
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_audit_log_hospital_id ON audit_log(hospital_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper Function: current_hospital_id()
-- Reads hospital_id for the authenticated user
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION current_hospital_id()
RETURNS UUID AS $$
  SELECT hospital_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security (RLS) Policies
-- ─────────────────────────────────────────────────────────────────────────────

-- Hospitals policies
DROP POLICY IF EXISTS hospitals_select_policy ON hospitals;
CREATE POLICY hospitals_select_policy ON hospitals
  FOR SELECT
  USING (id = current_hospital_id());

-- Profiles policies
DROP POLICY IF EXISTS profiles_select_policy ON profiles;
CREATE POLICY profiles_select_policy ON profiles
  FOR SELECT
  USING (id = auth.uid() OR hospital_id = current_hospital_id());

DROP POLICY IF EXISTS profiles_update_policy ON profiles;
CREATE POLICY profiles_update_policy ON profiles
  FOR UPDATE
  USING (id = auth.uid());

-- Departments policies
DROP POLICY IF EXISTS departments_select_policy ON departments;
CREATE POLICY departments_select_policy ON departments
  FOR SELECT
  USING (hospital_id = current_hospital_id());

DROP POLICY IF EXISTS departments_insert_policy ON departments;
CREATE POLICY departments_insert_policy ON departments
  FOR INSERT
  WITH CHECK (hospital_id = current_hospital_id());

DROP POLICY IF EXISTS departments_update_policy ON departments;
CREATE POLICY departments_update_policy ON departments
  FOR UPDATE
  USING (hospital_id = current_hospital_id())
  WITH CHECK (hospital_id = current_hospital_id());

DROP POLICY IF EXISTS departments_delete_policy ON departments;
CREATE POLICY departments_delete_policy ON departments
  FOR DELETE
  USING (hospital_id = current_hospital_id());

-- Audit Log policies
DROP POLICY IF EXISTS audit_log_select_policy ON audit_log;
CREATE POLICY audit_log_select_policy ON audit_log
  FOR SELECT
  USING (hospital_id = current_hospital_id());

DROP POLICY IF EXISTS audit_log_insert_policy ON audit_log;
CREATE POLICY audit_log_insert_policy ON audit_log
  FOR INSERT
  WITH CHECK (hospital_id = current_hospital_id());

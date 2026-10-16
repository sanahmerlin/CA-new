-- CareAfter Phase 2 Database Schema: Patients & Patient Records

-- 1. Patients Table
CREATE TABLE IF NOT EXISTS patients (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id         UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  department_id       UUID REFERENCES departments(id) ON DELETE SET NULL,
  full_name           TEXT NOT NULL,
  age                 INT NOT NULL,
  sex                 TEXT NOT NULL,
  patient_phone       TEXT NOT NULL,
  caregiver_name      TEXT,
  caregiver_relation  TEXT,
  caregiver_phone     TEXT,
  discharge_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  raw_history_text    TEXT,
  status              TEXT NOT NULL DEFAULT 'active',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_patients_hospital_id ON patients(hospital_id);
CREATE INDEX IF NOT EXISTS idx_patients_department_id ON patients(department_id);

-- 2. Patient Records Table (Confirmed clinical data)
CREATE TABLE IF NOT EXISTS patient_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id      UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  diagnosis        TEXT NOT NULL,
  medications      JSONB NOT NULL DEFAULT '[]'::jsonb,
  medical_history  JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_factors     JSONB NOT NULL DEFAULT '[]'::jsonb,
  allergies        JSONB NOT NULL DEFAULT '[]'::jsonb,
  follow_up_plan   TEXT,
  confirmed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE patient_records ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_patient_records_hospital_id ON patient_records(hospital_id);
CREATE INDEX IF NOT EXISTS idx_patient_records_patient_id ON patient_records(patient_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security (RLS) Policies
-- ─────────────────────────────────────────────────────────────────────────────

-- Patients policies
DROP POLICY IF EXISTS patients_select_policy ON patients;
CREATE POLICY patients_select_policy ON patients
  FOR SELECT
  USING (hospital_id = current_hospital_id());

DROP POLICY IF EXISTS patients_insert_policy ON patients;
CREATE POLICY patients_insert_policy ON patients
  FOR INSERT
  WITH CHECK (hospital_id = current_hospital_id());

DROP POLICY IF EXISTS patients_update_policy ON patients;
CREATE POLICY patients_update_policy ON patients
  FOR UPDATE
  USING (hospital_id = current_hospital_id())
  WITH CHECK (hospital_id = current_hospital_id());

DROP POLICY IF EXISTS patients_delete_policy ON patients;
CREATE POLICY patients_delete_policy ON patients
  FOR DELETE
  USING (hospital_id = current_hospital_id());

-- Patient Records policies
DROP POLICY IF EXISTS patient_records_select_policy ON patient_records;
CREATE POLICY patient_records_select_policy ON patient_records
  FOR SELECT
  USING (hospital_id = current_hospital_id());

DROP POLICY IF EXISTS patient_records_insert_policy ON patient_records;
CREATE POLICY patient_records_insert_policy ON patient_records
  FOR INSERT
  WITH CHECK (hospital_id = current_hospital_id());

DROP POLICY IF EXISTS patient_records_update_policy ON patient_records;
CREATE POLICY patient_records_update_policy ON patient_records
  FOR UPDATE
  USING (hospital_id = current_hospital_id())
  WITH CHECK (hospital_id = current_hospital_id());

DROP POLICY IF EXISTS patient_records_delete_policy ON patient_records;
CREATE POLICY patient_records_delete_policy ON patient_records
  FOR DELETE
  USING (hospital_id = current_hospital_id());

-- ==============================================================================
-- Migration: 006_careplus_subscriptions.sql
-- Description: Schema and seed data for Care+ Paid Tier (PayPal sandbox,
-- ambulances, on-duty doctors, and patient subscriptions)
-- ==============================================================================

-- 1. Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id              UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  paypal_subscription_id  TEXT UNIQUE,
  plan_id                 TEXT,
  status                  TEXT NOT NULL DEFAULT 'PENDING', -- 'ACTIVE' | 'CANCELLED' | 'PENDING'
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_patient_id ON subscriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paypal_id ON subscriptions(paypal_subscription_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Patients can only select their own subscription row
DROP POLICY IF EXISTS subscriptions_select_policy ON subscriptions;
CREATE POLICY subscriptions_select_policy ON subscriptions
  FOR SELECT
  USING (patient_id = auth.uid() OR auth.role() = 'service_role');

-- Inserts and updates restricted to service role key (enforced by RLS)
DROP POLICY IF EXISTS subscriptions_service_role_all ON subscriptions;
CREATE POLICY subscriptions_service_role_all ON subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Ambulances Table (Public read-only)
CREATE TABLE IF NOT EXISTS ambulances (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  driver_name   TEXT NOT NULL,
  phone         TEXT NOT NULL,
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  is_available  BOOLEAN NOT NULL DEFAULT true,
  base_area     TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ambulances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ambulances_read_policy ON ambulances;
CREATE POLICY ambulances_read_policy ON ambulances
  FOR SELECT
  USING (true);

-- 3. On-Duty Doctors Table (Read-only for authenticated users & service role)
CREATE TABLE IF NOT EXISTS on_duty_doctors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  specialty     TEXT NOT NULL,
  phone         TEXT NOT NULL,
  is_on_duty    BOOLEAN NOT NULL DEFAULT true,
  hospital      TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE on_duty_doctors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS on_duty_doctors_read_policy ON on_duty_doctors;
CREATE POLICY on_duty_doctors_read_policy ON on_duty_doctors
  FOR SELECT
  USING (true);

-- ==============================================================================
-- 4. Seed Simulated Data (Kochi, Kerala Lat: ~9.93-10.05, Lng: ~76.25-76.35)
-- All phone numbers and personnel are obviously simulated demo data.
-- ==============================================================================

-- Clear previously seeded ambulances to ensure idempotency
DELETE FROM ambulances WHERE phone LIKE '+91 90000 000%';

INSERT INTO ambulances (name, driver_name, phone, latitude, longitude, is_available, base_area) VALUES
  ('Kochi Metro EMS Unit 1', 'Manoj Kumar', '+91 90000 00001', 9.9816, 76.2999, true, 'Marine Drive'),
  ('Ernakulam North FastResponse', 'Sunil Varghese', '+91 90000 00002', 9.9984, 76.2842, true, 'Ernakulam North'),
  ('Edappally Advanced Life Support', 'Rajesh Nair', '+91 90000 00003', 10.0261, 76.3085, true, 'Edappally Toll'),
  ('Kakkanad InfoPark Rapid Care', 'Anand K.S.', '+91 90000 00004', 10.0159, 76.3419, true, 'Kakkanad SmartCity'),
  ('Vyttila Mobility Hub EMS', 'Biju Mathew', '+91 90000 00005', 9.9676, 76.3197, true, 'Vyttila Junction'),
  ('Fort Kochi Heritage Medical Unit', 'Pradeep Menon', '+91 90000 00006', 9.9658, 76.2427, true, 'Fort Kochi'),
  ('MG Road Trauma Ambulance', 'Shaji Thomas', '+91 90000 00007', 9.9723, 76.2801, true, 'MG Road Ravipuram'),
  ('Palarivattom Bypass Responder', 'Suresh Babu', '+91 90000 00008', 10.0041, 76.3102, true, 'Palarivattom'),
  ('Kalamassery Premier Transit Care', 'Deepu Alex', '+91 90000 00009', 10.0482, 76.3263, true, 'Kalamassery Premier'),
  ('Panampilly South City EMS', 'Vinod Pillai', '+91 90000 00010', 9.9572, 76.2982, true, 'Panampilly Nagar'),
  ('Aluva Railway Station Standby', 'Jayan K.P.', '+91 90000 00011', 10.1076, 76.3516, false, 'Aluva Bypass (Maintenance)'),
  ('Thoppumpady Port Care Unit', 'Haridas V.', '+91 90000 00012', 9.9324, 76.2625, false, 'Thoppumpady (Assigned)');

-- Clear previously seeded on-duty doctors to ensure idempotency
DELETE FROM on_duty_doctors WHERE phone LIKE '+91 98000 000%';

INSERT INTO on_duty_doctors (name, specialty, phone, is_on_duty, hospital) VALUES
  ('Dr. Lakshmi Narayanan', 'Cardiology & Critical Care', '+91 98000 00001', true, 'Sunrise Hospital'),
  ('Dr. Abraham George', 'General & Laparoscopic Surgery', '+91 98000 00002', true, 'Lakeview Medical'),
  ('Dr. Fathima Zahra', 'Pulmonology & Emergency Medicine', '+91 98000 00003', true, 'Sunrise Hospital'),
  ('Dr. Vikramaditya Rao', 'Orthopedics & Joint Replacement', '+91 98000 00004', false, 'Lakeview Medical'),
  ('Dr. Meera Nambiar', 'Neurology & Post-Op Recovery', '+91 98000 00005', false, 'Sunrise Hospital');

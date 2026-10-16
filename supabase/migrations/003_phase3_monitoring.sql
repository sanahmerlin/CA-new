-- ==============================================================================
-- Migration: 003_phase3_monitoring.sql
-- Description: Monitoring engine schema for CareAfter Phase 3
-- Tables: monitoring_plans, checkins, responses, alerts, app_settings
-- Patient extensions: access_code, plan_tier, consent_given, monitoring_tier
-- ==============================================================================

-- 1. Extend patients table for Phase 3
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS access_code VARCHAR(6) UNIQUE,
ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(10) DEFAULT 'free', -- 'free' | 'pro'
ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS monitoring_tier VARCHAR(10) DEFAULT 'moderate'; -- 'low' | 'moderate' | 'high'

CREATE INDEX IF NOT EXISTS idx_patients_access_code ON patients(access_code);

-- 2. Monitoring Plans (Generated once at enrolment)
CREATE TABLE IF NOT EXISTS monitoring_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  risk_tier VARCHAR(10) NOT NULL, -- 'low' | 'moderate' | 'high'
  window_days INT NOT NULL DEFAULT 30,
  schedule JSONB NOT NULL,
  focus_areas JSONB NOT NULL,
  red_flag_symptoms JSONB NOT NULL,
  model_name VARCHAR(50) DEFAULT 'gemini-3.5-flash',
  prompt_version VARCHAR(20) DEFAULT 'v1',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_plans_hospital ON monitoring_plans(hospital_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_plans_patient ON monitoring_plans(patient_id);

-- 3. Scheduled Check-Ins with Multilingual Questions & Follow-ups
CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  scheduled_day INT NOT NULL DEFAULT 1,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled' | 'sent' | 'answered' | 'missed'
  questions JSONB NOT NULL, -- Questions with English, Malayalam, Hindi + follow_ups
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkins_hospital ON checkins(hospital_id);
CREATE INDEX IF NOT EXISTS idx_checkins_patient ON checkins(patient_id);
CREATE INDEX IF NOT EXISTS idx_checkins_status ON checkins(status);

-- 4. Patient Responses & Clinical Triage Analysis
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  severity VARCHAR(10) NOT NULL, -- 'none' | 'watch' | 'urgent' | 'critical'
  clinical_summary TEXT,
  red_flags_detected JSONB,
  answered_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_responses_hospital ON responses(hospital_id);
CREATE INDEX IF NOT EXISTS idx_responses_patient ON responses(patient_id);

-- 5. Priority Alerts (Hospital Dashboard)
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  checkin_id UUID REFERENCES checkins(id) ON DELETE SET NULL,
  severity VARCHAR(10) NOT NULL, -- 'watch' | 'urgent' | 'critical'
  reasons JSONB NOT NULL,
  source VARCHAR(20) NOT NULL, -- 'rule' | 'redflag' | 'gemini' | 'missed'
  status VARCHAR(20) DEFAULT 'open', -- 'open' | 'acknowledged' | 'resolved'
  resolved_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_hospital ON alerts(hospital_id);
CREATE INDEX IF NOT EXISTS idx_alerts_patient ON alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);

-- 6. Hospital App Settings (Simulated Time Engine)
CREATE TABLE IF NOT EXISTS app_settings (
  hospital_id UUID PRIMARY KEY REFERENCES hospitals(id) ON DELETE CASCADE,
  simulated_time_offset_minutes INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed initial app_settings for default demo hospitals
INSERT INTO app_settings (hospital_id, simulated_time_offset_minutes)
SELECT id, 0 FROM hospitals
ON CONFLICT (hospital_id) DO NOTHING;

-- ==============================================================================
-- Row-Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE monitoring_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- monitoring_plans policies
CREATE POLICY "Users can view monitoring_plans in their hospital" ON monitoring_plans
  FOR SELECT USING (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert monitoring_plans in their hospital" ON monitoring_plans
  FOR INSERT WITH CHECK (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));

-- checkins policies
CREATE POLICY "Users can view checkins in their hospital" ON checkins
  FOR SELECT USING (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert checkins in their hospital" ON checkins
  FOR INSERT WITH CHECK (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update checkins in their hospital" ON checkins
  FOR UPDATE USING (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));

-- responses policies
CREATE POLICY "Users can view responses in their hospital" ON responses
  FOR SELECT USING (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert responses in their hospital" ON responses
  FOR INSERT WITH CHECK (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));

-- alerts policies
CREATE POLICY "Users can view alerts in their hospital" ON alerts
  FOR SELECT USING (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update alerts in their hospital" ON alerts
  FOR UPDATE USING (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert alerts in their hospital" ON alerts
  FOR INSERT WITH CHECK (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));

-- app_settings policies
CREATE POLICY "Users can view app_settings in their hospital" ON app_settings
  FOR SELECT USING (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update app_settings in their hospital" ON app_settings
  FOR ALL USING (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));

-- Enable Realtime publication for alerts, checkins, responses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'checkins'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE checkins;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'responses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE responses;
  END IF;
END $$;

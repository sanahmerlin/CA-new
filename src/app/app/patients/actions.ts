"use server";

import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

import { generateMonitoringPlan } from "@/lib/ai/generatePlan";

export interface EnrolPatientPayload {
  // Step 1 Basics
  full_name: string;
  age: number;
  sex: string;
  department_id: string;
  discharge_date: string;
  patient_phone: string;
  caregiver_name?: string;
  caregiver_relation?: string;
  caregiver_phone?: string;
  raw_history_text?: string;

  // Step 3 Confirmed Record
  diagnosis: string;
  medications: Array<{ name: string; dose: string; frequency: string }>;
  medical_history: string[];
  risk_factors: string[];
  allergies: string[];
  follow_up_plan?: string;

  // Phase 3 Parameters
  monitoring_tier?: "low" | "moderate" | "high";
  plan_tier?: "free" | "pro";
  consent_given?: boolean;
}

export async function enrolPatient(payload: EnrolPatientPayload) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required to enrol patient." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("hospital_id")
      .eq("id", user.id)
      .single();

    if (!profile?.hospital_id) {
      return { error: "Hospital profile not found." };
    }

    // Generate 6-digit numeric access code for patient portal
    const accessCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 1. Insert patient record
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .insert({
        hospital_id: profile.hospital_id,
        department_id: payload.department_id || null,
        full_name: payload.full_name,
        age: payload.age,
        sex: payload.sex,
        patient_phone: payload.patient_phone,
        caregiver_name: payload.caregiver_name || null,
        caregiver_relation: payload.caregiver_relation || null,
        caregiver_phone: payload.caregiver_phone || null,
        discharge_date: payload.discharge_date,
        raw_history_text: payload.raw_history_text || null,
        status: "active",
        access_code: accessCode,
        monitoring_tier: payload.monitoring_tier || "moderate",
        plan_tier: payload.plan_tier || "free",
        consent_given: payload.consent_given ?? true,
      })
      .select("id")
      .single();

    if (patientError || !patient) {
      return { error: patientError?.message || "Failed to create patient record." };
    }

    // 2. Insert confirmed clinical record
    const { error: recordError } = await supabase
      .from("patient_records")
      .insert({
        patient_id: patient.id,
        hospital_id: profile.hospital_id,
        diagnosis: payload.diagnosis,
        medications: payload.medications,
        medical_history: payload.medical_history,
        risk_factors: payload.risk_factors,
        allergies: payload.allergies,
        follow_up_plan: payload.follow_up_plan || null,
        confirmed_by: user.id,
        confirmed_at: new Date().toISOString(),
      });

    if (recordError) {
      return { error: `Patient enrolled but record failed: ${recordError.message}` };
    }

    // 3. Generate Phase 3 Monitoring Plan & Multilingual Check-ins
    const plan = await generateMonitoringPlan({
      patient_name: payload.full_name,
      age: payload.age,
      sex: payload.sex,
      diagnosis: payload.diagnosis,
      medications: payload.medications,
      risk_factors: payload.risk_factors,
      monitoring_tier: payload.monitoring_tier || "moderate",
    });

    // Save monitoring plan
    await supabase.from("monitoring_plans").insert({
      patient_id: patient.id,
      hospital_id: profile.hospital_id,
      risk_tier: plan.risk_tier,
      window_days: plan.window_days,
      schedule: plan.schedule,
      focus_areas: plan.focus_areas,
      red_flag_symptoms: plan.red_flag_symptoms,
      model_name: "gemini-3.5-flash",
    });

    // Generate initial 7 daily check-in rows
    const now = new Date();
    const checkinRows = [];
    for (let day = 1; day <= 7; day++) {
      const scheduledDate = new Date(now.getTime() + (day - 1) * 24 * 60 * 60 * 1000);
      checkinRows.push({
        patient_id: patient.id,
        hospital_id: profile.hospital_id,
        scheduled_day: day,
        scheduled_for: scheduledDate.toISOString(),
        status: day === 1 ? "active" : "scheduled",
        questions: plan.initial_questions,
      });
    }

    await supabase.from("checkins").insert(checkinRows);

    // 4. Write Audit Log
    await writeAudit("ENROL", "patients", patient.id);

    revalidatePath("/app/patients");
    revalidatePath("/app/departments");
    revalidatePath("/app/dashboard");

    return {
      success: true,
      patientId: patient.id,
      accessCode: accessCode,
      monitoringTier: payload.monitoring_tier || "moderate",
    };
  } catch (err: any) {
    return { error: err.message || "An unexpected error occurred during patient enrollment." };
  }
}

export async function enrolBatchPatients(patients: EnrolPatientPayload[]) {
  try {
    if (!patients || patients.length === 0) {
      return { error: "No patients provided for batch enrollment." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required to enrol patients." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("hospital_id")
      .eq("id", user.id)
      .single();

    if (!profile?.hospital_id) {
      return { error: "Hospital profile not found." };
    }

    // 1. Prepare patient insert records
    const patientRows = patients.map((p) => ({
      hospital_id: profile.hospital_id,
      department_id: p.department_id || null,
      full_name: p.full_name || "Discharged Patient",
      age: Number(p.age) || 50,
      sex: p.sex || "Other",
      patient_phone: p.patient_phone || "+91-9876543210",
      caregiver_name: p.caregiver_name || null,
      caregiver_relation: p.caregiver_relation || null,
      caregiver_phone: p.caregiver_phone || null,
      discharge_date: p.discharge_date || new Date().toISOString().split("T")[0],
      raw_history_text: p.raw_history_text || null,
      status: "active",
      access_code: Math.floor(100000 + Math.random() * 900000).toString(),
      monitoring_tier: p.monitoring_tier || "moderate",
      plan_tier: p.plan_tier || "free",
      consent_given: p.consent_given ?? true,
    }));

    const { data: insertedPatients, error: patientError } = await supabase
      .from("patients")
      .insert(patientRows)
      .select("id, access_code, full_name");

    if (patientError || !insertedPatients) {
      return { error: patientError?.message || "Failed to create batch patient records." };
    }

    // 2. Prepare clinical records for each inserted patient
    const recordRows = insertedPatients.map((patient, index) => {
      const source = patients[index];
      return {
        patient_id: patient.id,
        hospital_id: profile.hospital_id,
        diagnosis: source.diagnosis || "Post-Discharge Care Required",
        medications: source.medications || [],
        medical_history: source.medical_history || [],
        risk_factors: source.risk_factors || [],
        allergies: source.allergies || [],
        follow_up_plan: source.follow_up_plan || null,
        confirmed_by: user.id,
        confirmed_at: new Date().toISOString(),
      };
    });

    const { error: recordsError } = await supabase
      .from("patient_records")
      .insert(recordRows);

    if (recordsError) {
      return {
        error: `Patients created, but clinical records failed: ${recordsError.message}`,
      };
    }

    // 3. Generate initial check-ins for each patient
    const now = new Date();
    const allCheckinRows: any[] = [];
    for (let i = 0; i < insertedPatients.length; i++) {
      const patient = insertedPatients[i];
      const source = patients[i];
      const plan = await generateMonitoringPlan({
        patient_name: patient.full_name,
        age: Number(source.age) || 50,
        sex: source.sex,
        diagnosis: source.diagnosis,
        medications: source.medications,
        risk_factors: source.risk_factors,
        monitoring_tier: source.monitoring_tier || "moderate",
      });

      for (let day = 1; day <= 7; day++) {
        const scheduledDate = new Date(now.getTime() + (day - 1) * 24 * 60 * 60 * 1000);
        allCheckinRows.push({
          patient_id: patient.id,
          hospital_id: profile.hospital_id,
          scheduled_day: day,
          scheduled_for: scheduledDate.toISOString(),
          status: day === 1 ? "active" : "scheduled",
          questions: plan.initial_questions,
        });
      }
    }

    if (allCheckinRows.length > 0) {
      await supabase.from("checkins").insert(allCheckinRows);
    }

    // 4. Write batch audit log
    await writeAudit("BATCH_ENROL", "patients", `batch_${insertedPatients.length}`);

    revalidatePath("/app/patients");
    revalidatePath("/app/departments");
    revalidatePath("/app/dashboard");

    return { success: true, count: insertedPatients.length };
  } catch (err: any) {
    return { error: err.message || "An unexpected error occurred during batch enrollment." };
  }
}


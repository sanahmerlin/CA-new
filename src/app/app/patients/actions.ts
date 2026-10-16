"use server";

import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

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

    // 3. Write Audit Log
    await writeAudit("ENROL", "patients", patient.id);

    revalidatePath("/app/patients");
    revalidatePath("/app/dashboard");

    return { success: true, patientId: patient.id };
  } catch (err: any) {
    return { error: err.message || "An unexpected error occurred during patient enrollment." };
  }
}

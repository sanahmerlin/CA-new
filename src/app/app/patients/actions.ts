"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { writeAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { generateMonitoringPlan } from "@/lib/ai/generatePlan";
import { generatePatientCredentials } from "@/lib/auth/patient-session";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createServiceClient(url, serviceKey);
}

export interface Step1PatientPayload {
  full_name: string;
  age: number;
  sex: string;
  department_id: string;
  discharge_date: string;
  patient_phone: string;
  caregiver_name?: string;
  caregiver_relation?: string;
  caregiver_phone?: string;
}

export interface EnrolPatientPayload {
  patientId?: string;
  username?: string;
  plainPassword?: string;

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

  // Monitoring Parameters
  monitoring_tier?: "low" | "moderate" | "high";
  plan_tier?: "free" | "pro";
  consent_given?: boolean;
}

/**
 * Step 1: Create pending patient record with login credentials
 * Called immediately when staff save Step 1 (Basics)
 */
export async function createPendingPatientStep1(payload: Step1PatientPayload) {
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

    const serviceClient = getServiceClient();

    // Generate credentials with cross-hospital unique username check
    const credentials = await generatePatientCredentials(
      payload.full_name,
      Number(payload.age) || 45,
      async (candidate) => {
        const { data } = await serviceClient
          .from("patients")
          .select("id")
          .eq("username", candidate)
          .maybeSingle();
        return Boolean(data);
      }
    );

    // Insert pending patient
    const { data: patient, error: insertError } = await supabase
      .from("patients")
      .insert({
        hospital_id: profile.hospital_id,
        department_id: payload.department_id || null,
        full_name: payload.full_name,
        age: Number(payload.age) || 45,
        sex: payload.sex || "Other",
        patient_phone: payload.patient_phone,
        caregiver_name: payload.caregiver_name || null,
        caregiver_relation: payload.caregiver_relation || null,
        caregiver_phone: payload.caregiver_phone || null,
        discharge_date: payload.discharge_date,
        status: "pending",
        username: credentials.username,
        password_hash: credentials.passwordHash,
      })
      .select("id")
      .single();

    if (insertError || !patient) {
      return { error: insertError?.message || "Failed to create pending patient account." };
    }

    return {
      success: true,
      patientId: patient.id,
      username: credentials.username,
      plainPassword: credentials.plainPassword,
    };
  } catch (err: any) {
    return { error: err.message || "Failed to create patient account." };
  }
}

/**
 * Step 3: Confirm & Enrol
 * Activates patient, stores clinical records, and generates monitoring plan & checkins
 */
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

    let patientId = payload.patientId;
    let finalUsername = payload.username;
    let finalPlainPassword = payload.plainPassword;

    // If patient was already created on Step 1, update to active
    if (patientId) {
      const { error: updateError } = await supabase
        .from("patients")
        .update({
          status: "active",
          monitoring_tier: payload.monitoring_tier || "moderate",
          plan_tier: payload.plan_tier || "free",
          consent_given: payload.consent_given ?? true,
          raw_history_text: payload.raw_history_text || null,
        })
        .eq("id", patientId);

      if (updateError) {
        return { error: updateError.message };
      }
    } else {
      // Direct enrolment without Step 1 intermediate save
      const serviceClient = getServiceClient();
      const credentials = await generatePatientCredentials(
        payload.full_name,
        Number(payload.age) || 45,
        async (candidate) => {
          const { data } = await serviceClient
            .from("patients")
            .select("id")
            .eq("username", candidate)
            .maybeSingle();
          return Boolean(data);
        }
      );

      finalUsername = credentials.username;
      finalPlainPassword = credentials.plainPassword;

      const { data: newPatient, error: insertError } = await supabase
        .from("patients")
        .insert({
          hospital_id: profile.hospital_id,
          department_id: payload.department_id || null,
          full_name: payload.full_name,
          age: Number(payload.age) || 45,
          sex: payload.sex,
          patient_phone: payload.patient_phone,
          caregiver_name: payload.caregiver_name || null,
          caregiver_relation: payload.caregiver_relation || null,
          caregiver_phone: payload.caregiver_phone || null,
          discharge_date: payload.discharge_date,
          raw_history_text: payload.raw_history_text || null,
          status: "active",
          username: credentials.username,
          password_hash: credentials.passwordHash,
          monitoring_tier: payload.monitoring_tier || "moderate",
          plan_tier: payload.plan_tier || "free",
          consent_given: payload.consent_given ?? true,
        })
        .select("id")
        .single();

      if (insertError || !newPatient) {
        return { error: insertError?.message || "Failed to create patient record." };
      }
      patientId = newPatient.id;
    }

    // 2. Upsert confirmed clinical record
    const { error: recordError } = await supabase
      .from("patient_records")
      .upsert({
        patient_id: patientId,
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
      return { error: `Patient enrolled but clinical record failed: ${recordError.message}` };
    }

    // 3. Generate Phase 3 Monitoring Plan & Multilingual Check-ins
    const plan = await generateMonitoringPlan({
      patient_name: payload.full_name,
      age: Number(payload.age) || 45,
      sex: payload.sex,
      diagnosis: payload.diagnosis,
      medications: payload.medications,
      risk_factors: payload.risk_factors,
      monitoring_tier: payload.monitoring_tier || "moderate",
    });

    // Save monitoring plan
    await supabase.from("monitoring_plans").insert({
      patient_id: patientId,
      hospital_id: profile.hospital_id,
      risk_tier: plan.risk_tier,
      window_days: plan.window_days,
      schedule: plan.schedule,
      focus_areas: plan.focus_areas,
      red_flag_symptoms: plan.red_flag_symptoms,
      model_name: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      prompt_version: "v1",
    });

    // Save 7 scheduled daily check-ins
    const now = new Date();
    const checkinRows = [];
    for (let day = 1; day <= 7; day++) {
      const scheduledDate = new Date(now.getTime() + (day - 1) * 24 * 60 * 60 * 1000);
      checkinRows.push({
        patient_id: patientId,
        hospital_id: profile.hospital_id,
        scheduled_day: day,
        scheduled_for: scheduledDate.toISOString(),
        status: day === 1 ? "active" : "scheduled",
        questions: plan.initial_questions,
      });
    }

    await supabase.from("checkins").insert(checkinRows);

    // 4. Audit Log
    await writeAudit("ENROL_PATIENT", "patients", patientId);

    revalidatePath("/app/patients");
    revalidatePath("/app/departments");
    revalidatePath("/app/dashboard");

    return {
      success: true,
      patientId,
      username: finalUsername,
      plainPassword: finalPlainPassword,
    };
  } catch (err: any) {
    return { error: err.message || "An unexpected error occurred during enrollment." };
  }
}

/**
 * Reset Patient's Chat Action
 * Clears chat_messages, responses, checkins, and alerts for this patient,
 * then regenerates the first check-in so staff can repeat demos.
 */
export async function resetPatientChatAction(patientId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Unauthorized" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("hospital_id")
      .eq("id", user.id)
      .single();

    if (!profile?.hospital_id) return { error: "Hospital not found" };

    // Verify patient belongs to user hospital
    const { data: patient } = await supabase
      .from("patients")
      .select(`
        id,
        full_name,
        age,
        sex,
        monitoring_tier,
        patient_records (
          diagnosis,
          medications,
          risk_factors
        )
      `)
      .eq("id", patientId)
      .eq("hospital_id", profile.hospital_id)
      .single();

    if (!patient) return { error: "Patient not found in this hospital." };

    const serviceClient = getServiceClient();

    // 1. Delete alerts, responses, checkins
    await serviceClient.from("alerts").delete().eq("patient_id", patientId);
    await serviceClient.from("responses").delete().eq("patient_id", patientId);
    await serviceClient.from("checkins").delete().eq("patient_id", patientId);

    // 2. Regenerate check-in
    const record = Array.isArray(patient.patient_records)
      ? patient.patient_records[0]
      : patient.patient_records;

    const plan = await generateMonitoringPlan({
      patient_name: patient.full_name,
      age: patient.age,
      sex: patient.sex,
      diagnosis: record?.diagnosis || "Recovery Check",
      medications: (record?.medications as any) || [],
      risk_factors: (record?.risk_factors as any) || [],
      monitoring_tier: (patient.monitoring_tier as any) || "moderate",
    });

    const now = new Date();
    await serviceClient.from("checkins").insert({
      patient_id: patientId,
      hospital_id: profile.hospital_id,
      scheduled_day: 1,
      scheduled_for: now.toISOString(),
      status: "active",
      questions: plan.initial_questions,
    });

    revalidatePath(`/app/patients/${patientId}`);
    revalidatePath("/app/dashboard");

    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to reset patient chat." };
  }
}

/**
 * Batch Enrol Patients
 */
export async function batchEnrolPatients(patients: any[]) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Authentication required." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("hospital_id")
      .eq("id", user.id)
      .single();

    if (!profile?.hospital_id) return { error: "Hospital profile not found." };

    const serviceClient = getServiceClient();

    // Insert patients with generated credentials
    const insertedPatients = [];
    for (const p of patients) {
      const credentials = await generatePatientCredentials(
        p.full_name || "Discharged Patient",
        Number(p.age) || 45,
        async (candidate) => {
          const { data } = await serviceClient
            .from("patients")
            .select("id")
            .eq("username", candidate)
            .maybeSingle();
          return Boolean(data);
        }
      );

      const { data: newP } = await supabase
        .from("patients")
        .insert({
          hospital_id: profile.hospital_id,
          department_id: p.department_id || null,
          full_name: p.full_name || "Discharged Patient",
          age: Number(p.age) || 45,
          sex: p.sex || "Other",
          patient_phone: p.patient_phone || "+91-9876543210",
          caregiver_name: p.caregiver_name || null,
          caregiver_relation: p.caregiver_relation || null,
          caregiver_phone: p.caregiver_phone || null,
          discharge_date: p.discharge_date || new Date().toISOString().split("T")[0],
          raw_history_text: p.raw_history_text || null,
          status: "active",
          username: credentials.username,
          password_hash: credentials.passwordHash,
          monitoring_tier: p.monitoring_tier || "moderate",
          plan_tier: p.plan_tier || "free",
          consent_given: p.consent_given ?? true,
        })
        .select("id, full_name, username")
        .single();

      if (newP) {
        insertedPatients.push({ ...newP, source: p });
      }
    }

    // Insert clinical records and checkins
    const now = new Date();
    for (const item of insertedPatients) {
      await supabase.from("patient_records").insert({
        patient_id: item.id,
        hospital_id: profile.hospital_id,
        diagnosis: item.source.diagnosis || "Post-Discharge Recovery",
        medications: item.source.medications || [],
        medical_history: item.source.medical_history || [],
        risk_factors: item.source.risk_factors || [],
        allergies: item.source.allergies || [],
        follow_up_plan: item.source.follow_up_plan || null,
        confirmed_by: user.id,
        confirmed_at: new Date().toISOString(),
      });

      const plan = await generateMonitoringPlan({
        patient_name: item.full_name,
        age: Number(item.source.age) || 45,
        sex: item.source.sex,
        diagnosis: item.source.diagnosis,
        medications: item.source.medications,
        risk_factors: item.source.risk_factors,
        monitoring_tier: item.source.monitoring_tier || "moderate",
      });

      await supabase.from("checkins").insert({
        patient_id: item.id,
        hospital_id: profile.hospital_id,
        scheduled_day: 1,
        scheduled_for: now.toISOString(),
        status: "active",
        questions: plan.initial_questions,
      });
    }

    await writeAudit("BATCH_ENROL", "patients", `batch_${insertedPatients.length}`);
    revalidatePath("/app/patients");
    revalidatePath("/app/dashboard");

    return { success: true, count: insertedPatients.length };
  } catch (err: any) {
    return { error: err.message || "Failed batch enrollment." };
  }
}

export const enrolBatchPatients = batchEnrolPatients;


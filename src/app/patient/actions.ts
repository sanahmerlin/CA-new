"use server";

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  setPatientSessionCookie,
  getPatientSession,
  clearPatientSession,
  checkLoginRateLimit,
  recordFailedLoginAttempt,
  resetLoginRateLimit,
} from "@/lib/auth/patient-session";
import { scanForRedFlags, calculateFinalSeverity, Severity } from "@/lib/safety/redflags";
import { generateGeminiContent } from "@/lib/ai/gemini";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}

// ==============================================================================
// 1. Patient Authentication Actions
// ==============================================================================

export async function loginPatientAction(rawUsername: string, rawPassword: string) {
  try {
    const username = rawUsername.trim().toLowerCase();
    const password = rawPassword.trim();

    if (!username || !password) {
      return { error: "Please enter both username and password." };
    }

    // Rate-limit check (5 attempts per 10 minutes)
    const rateCheck = checkLoginRateLimit(username);
    if (!rateCheck.allowed) {
      return {
        error: `Too many failed login attempts. Please wait ${rateCheck.remainingMinutes || 10} minutes before trying again.`,
      };
    }

    const supabase = getServiceClient();

    // Query patient across hospitals by unique username
    const { data: patient, error } = await supabase
      .from("patients")
      .select("id, hospital_id, full_name, username, password_hash, status")
      .eq("username", username)
      .maybeSingle();

    if (error || !patient || !patient.password_hash) {
      recordFailedLoginAttempt(username);
      return { error: "Invalid username or password. Please verify the credentials on your discharge slip." };
    }

    // Compare bcrypt hash
    const match = await bcrypt.compare(password, patient.password_hash);
    if (!match) {
      recordFailedLoginAttempt(username);
      return { error: "Invalid username or password. Please verify the credentials on your discharge slip." };
    }

    // Success: reset rate limit & set session cookie
    resetLoginRateLimit(username);
    await setPatientSessionCookie({
      id: patient.id,
      hospital_id: patient.hospital_id,
      username: patient.username || username,
    });

    return { success: true };
  } catch (err: any) {
    return { error: err.message || "An error occurred during sign in." };
  }
}

export async function logoutPatientAction() {
  await clearPatientSession();
  redirect("/patient/login");
}

// ==============================================================================
// 2. Patient Portal Data (Session Protected)
// ==============================================================================

export async function getPatientPortalDataFromSession() {
  try {
    const session = await getPatientSession();
    if (!session) {
      return { error: "Session expired or invalid.", needLogin: true };
    }

    const supabase = getServiceClient();

    // Fetch patient scoped to session.patientId
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select(`
        id,
        full_name,
        age,
        sex,
        status,
        plan_tier,
        monitoring_tier,
        hospital_id,
        hospitals (
          name,
          contact_phone
        ),
        patient_records (
          diagnosis,
          medications,
          follow_up_plan
        )
      `)
      .eq("id", session.patientId)
      .maybeSingle();

    if (patientError || !patient) {
      return { error: "Patient record not found.", needLogin: true };
    }

    const hospital = Array.isArray(patient.hospitals)
      ? patient.hospitals[0]
      : patient.hospitals;

    const record = Array.isArray(patient.patient_records)
      ? patient.patient_records[0]
      : patient.patient_records;

    // Check if patient is in PENDING state (before doctor confirms enrolment)
    if (patient.status === "pending") {
      return {
        success: true,
        isPending: true,
        patient: {
          id: patient.id,
          fullName: patient.full_name,
          age: patient.age,
          sex: patient.sex,
          status: "pending",
          planTier: patient.plan_tier || "free",
          monitoringTier: patient.monitoring_tier || "moderate",
          hospitalName: hospital?.name || "CareAfter Health Network",
          hospitalPhone: hospital?.contact_phone || "+91-484-2800100",
          diagnosis: record?.diagnosis || "Pending Care Confirmation",
        },
        checkin: null,
      };
    }

    // Patient is ACTIVE: Fetch check-ins
    const { data: checkins } = await supabase
      .from("checkins")
      .select("id, scheduled_day, status, questions, scheduled_for")
      .eq("patient_id", patient.id)
      .order("scheduled_day", { ascending: true });

    // Pick first scheduled or active checkin
    const activeCheckin =
      checkins?.find((c) => c.status === "active" || c.status === "scheduled") ||
      checkins?.[0] ||
      null;

    // Also check if there's no checkin yet (still preparing questions)
    if (!activeCheckin) {
      return {
        success: true,
        isPending: true,
        patient: {
          id: patient.id,
          fullName: patient.full_name,
          age: patient.age,
          sex: patient.sex,
          status: "pending",
          planTier: patient.plan_tier || "free",
          monitoringTier: patient.monitoring_tier || "moderate",
          hospitalName: hospital?.name || "CareAfter Health Network",
          hospitalPhone: hospital?.contact_phone || "+91-484-2800100",
          diagnosis: record?.diagnosis || "Post-Discharge Recovery",
        },
        checkin: null,
      };
    }

    return {
      success: true,
      isPending: false,
      patient: {
        id: patient.id,
        fullName: patient.full_name,
        age: patient.age,
        sex: patient.sex,
        status: patient.status,
        planTier: patient.plan_tier || "free",
        monitoringTier: patient.monitoring_tier || "moderate",
        hospitalName: hospital?.name || "CareAfter Health Network",
        hospitalPhone: hospital?.contact_phone || "+91-484-2800100",
        diagnosis: record?.diagnosis || "Post-Discharge Recovery",
      },
      checkin: activeCheckin,
    };
  } catch (err: any) {
    return { error: err.message || "Failed to load patient portal." };
  }
}

// ==============================================================================
// 3. Submit Check-in Responses (Session Protected)
// ==============================================================================

export async function submitPatientCheckinFromSession(payload: {
  checkinId: string;
  answers: Record<string, string>;
  freeText?: string;
  questions: any[];
}) {
  try {
    const session = await getPatientSession();
    if (!session) {
      return { error: "Unauthorized session. Please log in again." };
    }

    const supabase = getServiceClient();

    // 1. Verify patient & hospital match session
    const { data: patient, error: pError } = await supabase
      .from("patients")
      .select("id, hospital_id, full_name, plan_tier")
      .eq("id", session.patientId)
      .single();

    if (pError || !patient) {
      return { error: "Patient record not found." };
    }

    // 2. Deterministic Rule & Red Flag Scan
    let ruleSeverity: Severity = "none";
    const ruleAlertReasons: string[] = [];

    for (const q of payload.questions || []) {
      const ansVal = payload.answers[q.id];
      if (ansVal && Array.isArray(q.concern_if) && q.concern_if.includes(ansVal)) {
        const qSev: Severity = q.severity_if_concern || "watch";
        if (qSev === "critical" || ruleSeverity === "none") {
          ruleSeverity = qSev;
        } else if (qSev === "urgent" && ruleSeverity !== "critical") {
          ruleSeverity = "urgent";
        }
        ruleAlertReasons.push(`Reported concern: "${ansVal}" on question: "${q.text?.en || q.topic}"`);
      }
    }

    // Scan free text and answers for acute red flags
    const combinedText = [
      payload.freeText || "",
      ...Object.values(payload.answers),
    ].join(" ");

    const redFlagResult = scanForRedFlags(combinedText);
    if (redFlagResult.matchedFlags.length > 0) {
      ruleAlertReasons.push(...redFlagResult.matchedFlags.map((k) => `Detected acute symptom: "${k}"`));
    }

    // 3. Gemini Clinical Triage & Advice Synthesis
    let geminiSeverity: Severity = "none";
    let clinicalSummary = "";
    let adviceToPatient = "";

    try {
      const prompt = `You are a clinical post-discharge safety agent assessing a patient's daily check-in responses.
Patient: ${patient.full_name}
Answers Provided:
${JSON.stringify(payload.answers, null, 2)}
Patient Free-text notes: "${payload.freeText || "None"}"

Classify this into exactly one severity level: "none", "watch", "urgent", or "critical".
Output valid JSON only with keys:
- "severity": "none" | "watch" | "urgent" | "critical"
- "clinical_summary": 1 to 2 concise clinical sentences explaining findings for attending doctors.
- "advice_to_patient": Warm, reassuring, clear 1 to 2 sentences directly guiding the patient on what to do next.`;

      const geminiRes = await generateGeminiContent({ contents: [prompt] });
      const cleaned = geminiRes.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.severity && ["none", "watch", "urgent", "critical"].includes(parsed.severity)) {
        geminiSeverity = parsed.severity;
      }
      clinicalSummary = parsed.clinical_summary || "";
      adviceToPatient = parsed.advice_to_patient || "";
    } catch {
      clinicalSummary = `Patient completed daily check-in with ${Object.keys(payload.answers).length} responses.`;
      adviceToPatient = "Thank you for completing your check-in. Your care team has received your responses.";
    }

    // 4. MAX Clamping: Deterministic rules and red-flags CANNOT be downgraded by Gemini
    const finalSeverity = calculateFinalSeverity(ruleSeverity, redFlagResult.suggestedSeverity, geminiSeverity);

    if (finalSeverity === "critical" && !adviceToPatient) {
      adviceToPatient = "URGENT MEDICAL ATTENTION ADVISED: Please immediately seek emergency medical care or call 108.";
    } else if (finalSeverity === "urgent" && !adviceToPatient) {
      adviceToPatient = "Your care team has been alerted about your symptoms and will review your status shortly.";
    }

    // 5. Save Response to Database
    const { error: respError } = await supabase.from("responses").insert({
      checkin_id: payload.checkinId,
      patient_id: patient.id,
      hospital_id: patient.hospital_id,
      answers: payload.answers,
      severity: finalSeverity,
      clinical_summary: clinicalSummary,
      red_flags_detected: redFlagResult.matchedFlags,
      answered_at: new Date().toISOString(),
    });

    if (respError) {
      console.error("Failed to save response:", respError);
    }

    // 6. Update Checkin status to 'answered'
    await supabase
      .from("checkins")
      .update({ status: "answered" })
      .eq("id", payload.checkinId);

    // 7. If Severity is watch, urgent, or critical -> Create Live Hospital Alert
    if (finalSeverity !== "none") {
      const allReasons = Array.from(new Set(ruleAlertReasons));
      if (allReasons.length === 0) {
        allReasons.push(`Clinical assessment classified as ${finalSeverity}`);
      }

      await supabase.from("alerts").insert({
        patient_id: patient.id,
        hospital_id: patient.hospital_id,
        checkin_id: payload.checkinId,
        severity: finalSeverity,
        reasons: allReasons,
        source: redFlagResult.suggestedSeverity !== "none" ? "redflag" : ruleSeverity !== "none" ? "rule" : "gemini",
        status: "open",
      });
    }

    revalidatePath("/app/dashboard");
    revalidatePath(`/app/patients/${patient.id}`);

    return {
      success: true,
      severity: finalSeverity,
      adviceToPatient,
      clinicalSummary,
    };
  } catch (err: any) {
    return { error: err.message || "Failed to submit check-in." };
  }
}

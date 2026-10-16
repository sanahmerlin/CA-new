"use server";

import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { scanForRedFlags, calculateFinalSeverity, Severity } from "@/lib/safety/redflags";
import { generateGeminiContent } from "@/lib/ai/gemini";
import { revalidatePath } from "next/cache";

// Service client to safely read/write patient portal by validated access code
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}

export async function getPatientPortalData(accessCode: string) {
  try {
    const cleanCode = accessCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      return { error: "Please enter a valid 6-digit access code." };
    }

    const supabase = getServiceClient();

    // 1. Fetch patient
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select(`
        id,
        full_name,
        age,
        sex,
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
      .eq("access_code", cleanCode)
      .maybeSingle();

    if (patientError || !patient) {
      return { error: "No patient record found for this 6-digit code. Please verify the code on your discharge summary." };
    }

    // 2. Fetch active or upcoming check-in
    const { data: checkins } = await supabase
      .from("checkins")
      .select("id, scheduled_day, status, questions, scheduled_for")
      .eq("patient_id", patient.id)
      .order("scheduled_day", { ascending: true });

    // Pick first active or scheduled check-in, or most recent if all answered
    const activeCheckin =
      checkins?.find((c) => c.status === "active" || c.status === "scheduled") ||
      checkins?.[0] ||
      null;

    const hospital = Array.isArray(patient.hospitals)
      ? patient.hospitals[0]
      : patient.hospitals;

    const record = Array.isArray(patient.patient_records)
      ? patient.patient_records[0]
      : patient.patient_records;

    return {
      success: true,
      patient: {
        id: patient.id,
        fullName: patient.full_name,
        age: patient.age,
        sex: patient.sex,
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

export async function submitPatientCheckin(payload: {
  accessCode: string;
  checkinId: string;
  answers: Record<string, string>; // questionId -> answer value
  freeText?: string;
  questions: any[];
}) {
  try {
    const supabase = getServiceClient();

    // 1. Verify patient by code
    const { data: patient } = await supabase
      .from("patients")
      .select("id, hospital_id, full_name, plan_tier")
      .eq("access_code", payload.accessCode.trim())
      .single();

    if (!patient) {
      return { error: "Unauthorized access code." };
    }

    // 2. Deterministic Red Flag Scan
    const answerValues = Object.values(payload.answers);
    if (payload.freeText) answerValues.push(payload.freeText);
    const redFlagResult = scanForRedFlags(answerValues);

    // 3. Rule Layer: evaluate question concern_if
    let ruleSeverity: Severity = "none";
    const ruleConcerns: string[] = [];

    for (const q of payload.questions) {
      const selectedVal = payload.answers[q.id];
      if (selectedVal && q.concern_if?.includes(selectedVal)) {
        ruleConcerns.push(`${q.topic || "Question"}: reported ${selectedVal}`);
        if (q.severity_if_concern === "critical") ruleSeverity = "critical";
        else if (q.severity_if_concern === "urgent" && ruleSeverity !== "critical")
          ruleSeverity = "urgent";
        else if (ruleSeverity === "none") ruleSeverity = "watch";
      }

      // Check follow-ups if answered
      if (q.follow_ups) {
        for (const fu of q.follow_ups) {
          const fuVal = payload.answers[fu.id];
          if (fuVal && fu.concern_if?.includes(fuVal)) {
            ruleConcerns.push(`Follow-up (${fu.id}): ${fuVal}`);
            if (fu.severity_if_concern === "critical") ruleSeverity = "critical";
            else if (fu.severity_if_concern === "urgent" && ruleSeverity !== "critical")
              ruleSeverity = "urgent";
          }
        }
      }
    }

    // 4. Gemini AI Assessment
    let geminiSeverity: Severity = "none";
    let clinicalSummary = "Patient completed routine check-in with normal vitals and symptoms.";

    try {
      const aiPrompt = `Analyze this post-discharge patient's check-in response:
Patient: ${patient.full_name}
Answers: ${JSON.stringify(payload.answers)}
Free Text: ${payload.freeText || "None"}
Red Flags Detected: ${redFlagResult.matchedFlags.join(", ") || "None"}

Provide a brief 1-2 sentence clinical summary paragraph for the attending physician, and evaluate triage severity: none, watch, urgent, or critical.
Return JSON:
{
  "severity": "none" | "watch" | "urgent" | "critical",
  "clinical_summary": "1-2 sentence clinical assessment"
}`;

      const aiRes = await generateGeminiContent({
        contents: [aiPrompt],
        responseMimeType: "application/json",
      });

      let cleaned = aiRes.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
      }

      const parsed = JSON.parse(cleaned);
      geminiSeverity = parsed.severity || "none";
      clinicalSummary = parsed.clinical_summary || clinicalSummary;
    } catch (e: any) {
      console.warn("Gemini triage assessment fallback:", e.message);
      if (redFlagResult.hasCritical) {
        clinicalSummary = "Emergency red flag symptoms detected requiring immediate hospital intervention.";
      } else if (redFlagResult.hasUrgent) {
        clinicalSummary = "Urgent clinical symptoms reported. Clinical nurse outreach recommended.";
      }
    }

    // 5. Calculate Final Severity (Deterministic MAX Clamping)
    const finalSeverity = calculateFinalSeverity(
      ruleSeverity,
      redFlagResult.suggestedSeverity,
      geminiSeverity
    );

    // 6. Save response into database
    await supabase.from("responses").insert({
      checkin_id: payload.checkinId,
      patient_id: patient.id,
      hospital_id: patient.hospital_id,
      answers: {
        ...payload.answers,
        free_text: payload.freeText || null,
      },
      severity: finalSeverity,
      clinical_summary: clinicalSummary,
      red_flags_detected: redFlagResult.matchedFlags,
    });

    // Update check-in status
    await supabase
      .from("checkins")
      .update({ status: "answered" })
      .eq("id", payload.checkinId);

    // 7. If watch, urgent, or critical, create an alert for the hospital dashboard
    if (finalSeverity !== "none") {
      const allReasons = [
        ...redFlagResult.matchedFlags,
        ...ruleConcerns,
      ];

      await supabase.from("alerts").insert({
        patient_id: patient.id,
        hospital_id: patient.hospital_id,
        checkin_id: payload.checkinId,
        severity: finalSeverity,
        reasons: allReasons.length > 0 ? allReasons : ["Clinical assessment indicated elevated risk"],
        source: redFlagResult.hasCritical
          ? "redflag"
          : ruleConcerns.length > 0
          ? "rule"
          : "gemini",
        status: "open",
      });
    }

    revalidatePath("/app/dashboard");
    revalidatePath("/app/patients");

    return {
      success: true,
      severity: finalSeverity,
      clinicalSummary,
      hasCritical: finalSeverity === "critical",
      hasUrgent: finalSeverity === "urgent",
      planTier: patient.plan_tier || "free",
    };
  } catch (err: any) {
    return { error: err.message || "Failed to submit check-in." };
  }
}

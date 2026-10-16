import { z } from "zod";
import { generateGeminiContent } from "./gemini";

// ─── Question Schema with Multilingual Support & Branched Follow-ups ────────
export const localizedTextSchema = z.object({
  en: z.string(),
  ml: z.string().default(""), // Malayalam
  hi: z.string().default(""), // Hindi
});

export const followUpQuestionSchema = z.object({
  id: z.string(),
  text: localizedTextSchema,
  type: z.enum(["yes_no", "scale", "choice"]),
  options: z.array(
    z.object({
      value: z.string(),
      label: localizedTextSchema,
    })
  ),
  concern_if: z.array(z.string()),
  severity_if_concern: z.enum(["watch", "urgent", "critical"]).default("urgent"),
});

export const checkinQuestionSchema = z.object({
  id: z.string(),
  topic: z.string(),
  text: localizedTextSchema,
  type: z.enum(["yes_no", "scale", "choice"]),
  options: z.array(
    z.object({
      value: z.string(),
      label: localizedTextSchema,
    })
  ),
  concern_if: z.array(z.string()), // e.g. ["Severe", "Moderate"] or ["Yes"]
  severity_if_concern: z.enum(["watch", "urgent", "critical"]).default("urgent"),
  follow_ups: z.array(followUpQuestionSchema).default([]),
});

export type CheckinQuestion = z.infer<typeof checkinQuestionSchema>;
export type FollowUpQuestion = z.infer<typeof followUpQuestionSchema>;

export const monitoringPlanSchema = z.object({
  risk_tier: z.enum(["low", "moderate", "high"]).default("moderate"),
  window_days: z.number().min(14).max(150).default(30),
  focus_areas: z.array(z.string()).default([]),
  red_flag_symptoms: z.array(z.string()).default([]),
  schedule: z.array(
    z.object({
      phase_name: z.string(),
      from_day: z.number(),
      to_day: z.number(),
      checkins_per_day: z.number().min(1).max(3),
    })
  ),
  initial_questions: z.array(checkinQuestionSchema).default([]),
});

export type MonitoringPlan = z.infer<typeof monitoringPlanSchema>;

const SYSTEM_INSTRUCTION = `You are an expert post-discharge clinical care physician and patient monitoring specialist.
Your task is to generate a personalized monitoring plan and condition-specific check-in questions for a newly discharged patient.

CRITICAL RULES:
1. MULTILINGUAL REQUIREMENT:
   Every question and option label MUST be translated into three languages:
   - "en": English
   - "ml": Malayalam (മലയാളം, Kerala primary language)
   - "hi": Hindi (हिंदी, Indian national language)
   Ensure translations use simple, natural spoken words suitable for elderly patients.

2. QUESTIONS & BRANCHED FOLLOW-UPS:
   - Generate 3 to 5 core daily check-in questions.
   - Always include 1 medication adherence question ("Did you take all prescribed medicines today?").
   - Tailor symptoms to the patient's diagnosis (e.g. chest heaviness, breathlessness for cardiology; wound swelling, pain for orthopaedics/surgery; cough, sputum for pulmonology).
   - For every question where an answer indicates clinical concern (e.g. "Severe" or "Moderate" pain, or "Yes" to breathlessness), provide 2 PRECISE follow-up questions in "follow_ups" to drill into severity (e.g., radiation to arm, cold sweats, rest vs exertion).

3. SCHEDULE & WINDOW:
   - Low risk: 14 to 30 days window.
   - Moderate risk: 30 to 60 days window.
   - High risk: 60 to 90 days window.

4. Return strictly valid JSON adhering to the schema keys.`;

/**
 * Robust fallback questions if Gemini API is unreachable or returns invalid format
 */
export function getDefaultQuestionsForDiagnosis(
  diagnosis: string,
  patientName: string
): CheckinQuestion[] {
  const firstName = patientName.split(" ")[0] || "Patient";
  const isCardio = /cardio|heart|infarct|stemi|nstemi|angina|cabg|pci/i.test(diagnosis);
  const isOrtho = /ortho|knee|hip|fracture|arthroplasty|tka|thr|joint/i.test(diagnosis);

  if (isCardio) {
    return [
      {
        id: "q_chest_pain",
        topic: "Chest Symptoms",
        text: {
          en: `${firstName}, have you felt any chest heaviness, tightness, or pain today?`,
          ml: `${firstName}, ഇന്ന് നെഞ്ചിൽ ഭാരമോ, വേദനയോ, അസ്വസ്ഥതയോ അനുഭവപ്പെട്ടോ?`,
          hi: `${firstName}, क्या आज आपको सीने में भारीपन, जकड़न या दर्द महसूस हुआ?`,
        },
        type: "scale",
        options: [
          { value: "None", label: { en: "None / Fine", ml: "ഇല്ല / സുഖം", hi: "कोई नहीं / ठीक है" } },
          { value: "Mild", label: { en: "Mild", ml: "നേരിയത്", hi: "हल्का" } },
          { value: "Severe", label: { en: "Moderate to Severe", ml: "കഠിനമായത്", hi: "मध्यम से गंभीर" } },
        ],
        concern_if: ["Severe"],
        severity_if_concern: "critical",
        follow_ups: [
          {
            id: "fu_chest_radiate",
            text: {
              en: "Does this pain spread to your left arm, neck, or jaw?",
              ml: "ഈ വേദന ഇടത് കൈയിലേക്കോ കഴുത്തിലേക്കോ പടരുന്നുണ്ടോ?",
              hi: "क्या यह दर्द आपके बाएं हाथ, गर्दन या जबड़े में फैल रहा है?",
            },
            type: "yes_no",
            options: [
              { value: "Yes", label: { en: "Yes", ml: "അതെ", hi: "हाँ" } },
              { value: "No", label: { en: "No", ml: "ഇല്ല", hi: "नहीं" } },
            ],
            concern_if: ["Yes"],
            severity_if_concern: "critical",
          },
          {
            id: "fu_chest_sweat",
            text: {
              en: "Are you also experiencing cold sweats or dizziness?",
              ml: "തണുത്ത വിയർപ്പോ തലകറക്കമോ അനുഭവപ്പെടുന്നുണ്ടോ?",
              hi: "क्या आपको ठंडा पसीना या चक्कर भी आ रहा है?",
            },
            type: "yes_no",
            options: [
              { value: "Yes", label: { en: "Yes", ml: "അതെ", hi: "हाँ" } },
              { value: "No", label: { en: "No", ml: "ഇല്ല", hi: "नहीं" } },
            ],
            concern_if: ["Yes"],
            severity_if_concern: "critical",
          },
        ],
      },
      {
        id: "q_breath",
        topic: "Breathing",
        text: {
          en: "Are you having any difficulty breathing while resting or lying flat?",
          ml: "വിശ്രമിക്കുമ്പോഴോ കിടക്കുമ്പോഴോ ശ്വാസമെടുക്കാൻ ബുദ്ധിമുട്ടുണ്ടോ?",
          hi: "क्या आराम करते समय या लेटने पर सांस लेने में कोई कठिनाई हो रही है?",
        },
        type: "yes_no",
        options: [
          { value: "No", label: { en: "No, breathing easily", ml: "ഇല്ല, ശ്വാസം സാധാരണമാണ്", hi: "नहीं, सांस सामान्य है" } },
          { value: "Yes", label: { en: "Yes, feeling breathless", ml: "അതെ, ശ്വാസംമുട്ടലുണ്ട്", hi: "हाँ, सांस फूल रही है" } },
        ],
        concern_if: ["Yes"],
        severity_if_concern: "urgent",
        follow_ups: [
          {
            id: "fu_breath_pillows",
            text: {
              en: "Do you need extra pillows under your head to breathe comfortably at night?",
              ml: "രാത്രി സുഖമായി ശ്വാസമെടുക്കാൻ കൂടുതൽ തലയിണകൾ വെക്കേണ്ടി വരുന്നുണ്ടോ?",
              hi: "क्या रात में सांस लेने के लिए अतिरिक्त तकियों की जरूरत पड़ रही है?",
            },
            type: "yes_no",
            options: [
              { value: "Yes", label: { en: "Yes", ml: "അതെ", hi: "हाँ" } },
              { value: "No", label: { en: "No", ml: "ഇല്ല", hi: "नहीं" } },
            ],
            concern_if: ["Yes"],
            severity_if_concern: "urgent",
          },
        ],
      },
      {
        id: "q_meds",
        topic: "Medications",
        text: {
          en: "Have you taken all your prescribed morning and afternoon heart medications?",
          ml: "ഡോക്ടർ നിർദ്ദേശിച്ച എല്ലാ ഹൃദ്രോഗ മരുന്നുകളും കൃത്യമായി കഴിച്ചോ?",
          hi: "क्या आपने डॉक्टर द्वारा बताई गई दिल की सभी दवाएं सही समय पर ली हैं?",
        },
        type: "yes_no",
        options: [
          { value: "Yes", label: { en: "Yes, took all pills", ml: "അതെ, മരുന്നുകൾ കഴിച്ചു", hi: "हाँ, सभी दवाएं ली हैं" } },
          { value: "No", label: { en: "No, missed doses", ml: "ഇല്ല, കഴിക്കാൻ പറ്റിയില്ല", hi: "नहीं, खुराक छूट गई" } },
        ],
        concern_if: ["No"],
        severity_if_concern: "watch",
        follow_ups: [],
      },
    ];
  }

  // Ortho / General Surgical default
  return [
    {
      id: "q_wound",
      topic: "Wound & Surgical Site",
      text: {
        en: `${firstName}, is your surgical wound clean, or do you notice severe pain, swelling, or redness?`,
        ml: `${firstName}, ശസ്ത്രക്രിയാ മുറിവ് വൃത്തിയായി ഇരിക്കുന്നുണ്ടോ, അതോ കഠിനമായ വേദനയോ നീരോ ചുവപ്പോ ഉണ്ടോ?`,
        hi: `${firstName}, क्या सर्जरी का घाव ठीक है, या अत्यधिक दर्द, सूजन या लालिमा महसूस हो रही है?`,
      },
      type: "scale",
      options: [
        { value: "Normal", label: { en: "Normal & Clean", ml: "സാധാരണ നിലയിൽ", hi: "सामान्य और साफ" } },
        { value: "Moderate", label: { en: "Moderate Pain", ml: "മിതമായ വേദന", hi: "मध्यम दर्द" } },
        { value: "Severe", label: { en: "Severe Redness or Pus", ml: "കഠിനമായ ചുവപ്പ് / പഴുപ്പ്", hi: "गंभीर लालिमा या मवाद" } },
      ],
      concern_if: ["Severe"],
      severity_if_concern: "urgent",
      follow_ups: [
        {
          id: "fu_fever",
          text: {
            en: "Do you have a fever or body chills above 100°F (37.8°C)?",
            ml: "നിങ്ങൾക്ക് പനിയോ വിറയലോ അനുഭവപ്പെടുന്നുണ്ടോ?",
            hi: "क्या आपको बुखार या कंपकंपी महसूस हो रही है?",
          },
          type: "yes_no",
          options: [
            { value: "Yes", label: { en: "Yes", ml: "അതെ", hi: "हाँ" } },
            { value: "No", label: { en: "No", ml: "ഇല്ല", hi: "नहीं" } },
          ],
          concern_if: ["Yes"],
          severity_if_concern: "urgent",
        },
      ],
    },
    {
      id: "q_mobility",
      topic: "Mobility & DVT",
      text: {
        en: "Do you have any new or severe swelling, tenderness, or warmth in your calf?",
        ml: "കാലിൻ്റെ പേശികളിൽ നീരോ, തൊടുമ്പോൾ വേദനയോ, അമിത ചൂടോ ഉണ്ടോ?",
        hi: "क्या पैर या पिंडली में नई सूजन, छूने पर दर्द या गर्माहट महसूस हो रही है?",
      },
      type: "yes_no",
      options: [
        { value: "No", label: { en: "No swelling", ml: "നീരില്ല", hi: "कोई सूजन नहीं" } },
        { value: "Yes", label: { en: "Yes, calf pain/swelling", ml: "അതെ, വേദനയും നീരുമുണ്ട്", hi: "हाँ, दर्द और सूजन है" } },
      ],
      concern_if: ["Yes"],
      severity_if_concern: "critical",
      follow_ups: [],
    },
    {
      id: "q_meds_gen",
      topic: "Medication Adherence",
      text: {
        en: "Did you take your prescribed antibiotics, pain relievers, and blood thinners today?",
        ml: "ഇന്നത്തെ മരുന്നുകളും ആന്റിബയോട്ടിക്കുകളും കൃത്യമായി കഴിച്ചോ?",
        hi: "क्या आपने आज की सभी दवाइयां सही समय पर ली हैं?",
      },
      type: "yes_no",
      options: [
        { value: "Yes", label: { en: "Yes, took all", ml: "അതെ, എല്ലാം കഴിച്ചു", hi: "हाँ, सभी ली हैं" } },
        { value: "No", label: { en: "No, missed some", ml: "ഇല്ല, ചിലത് വിട്ടുപോയി", hi: "नहीं, कुछ छूट गईं" } },
      ],
      concern_if: ["No"],
      severity_if_concern: "watch",
      follow_ups: [],
    },
  ];
}

/**
 * Generates a full monitoring plan and multilingual check-in questions via Gemini AI.
 */
export async function generateMonitoringPlan(patientRecord: {
  patient_name: string;
  age: number;
  sex: string;
  diagnosis: string;
  medications?: any[];
  medical_history?: string[];
  risk_factors?: string[];
  monitoring_tier?: string;
}): Promise<MonitoringPlan> {
  const prompt = `Generate a post-discharge monitoring plan and multilingual check-in questions for this patient:
Name: ${patientRecord.patient_name}
Age/Sex: ${patientRecord.age} ${patientRecord.sex}
Diagnosis: ${patientRecord.diagnosis}
Medications: ${JSON.stringify(patientRecord.medications || [])}
Risk Factors: ${(patientRecord.risk_factors || []).join(", ")}
Target Monitoring Tier: ${patientRecord.monitoring_tier || "moderate"}`;

  try {
    const rawResponse = await generateGeminiContent({
      contents: [prompt],
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
    });

    let cleaned = rawResponse.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const parsed = JSON.parse(cleaned);
    const validated = monitoringPlanSchema.parse(parsed);

    // If AI questions are empty or malformed, inject the robust default questions
    if (!validated.initial_questions || validated.initial_questions.length === 0) {
      validated.initial_questions = getDefaultQuestionsForDiagnosis(
        patientRecord.diagnosis,
        patientRecord.patient_name
      );
    }

    return validated;
  } catch (err: any) {
    console.warn("AI plan generation fallback engaged:", err.message);

    const tier = (patientRecord.monitoring_tier as "low" | "moderate" | "high") || "moderate";
    const windowDays = tier === "low" ? 21 : tier === "high" ? 60 : 30;

    return {
      risk_tier: tier,
      window_days: windowDays,
      focus_areas: ["Medication compliance", "Symptom exacerbation", "Wound & mobility care"],
      red_flag_symptoms: ["Chest pain", "Dyspnea", "Fever > 101F", "Calf swelling"],
      schedule: [
        { phase_name: "Acute Phase", from_day: 1, to_day: 7, checkins_per_day: 1 },
        { phase_name: "Stabilization Phase", from_day: 8, to_day: 30, checkins_per_day: 1 },
      ],
      initial_questions: getDefaultQuestionsForDiagnosis(
        patientRecord.diagnosis,
        patientRecord.patient_name
      ),
    };
  }
}

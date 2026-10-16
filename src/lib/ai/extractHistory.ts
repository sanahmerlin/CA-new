import { z } from "zod";
import { generateGeminiContent, InlineMediaPart } from "./gemini";

// ─── Zod Schema for Extracted Clinical History ──────────────────────────────
export const medicationSchema = z.object({
  name: z.string().nullish().transform((v) => v || "Medication name not specified"),
  dose: z.string().nullish().transform((v) => v || "Dose not stated"),
  frequency: z.string().nullish().transform((v) => v || "Frequency not stated"),
});

export type Medication = z.infer<typeof medicationSchema>;

export const extractedHistorySchema = z.object({
  patient_name: z
    .string()
    .nullish()
    .transform((val) => val?.trim() || "Discharged Patient"),
  age: z
    .coerce
    .number()
    .nullish()
    .transform((val) => (val && val > 0 && val < 130 ? val : 50)),
  sex: z
    .string()
    .nullish()
    .transform((val) => {
      const s = val?.toLowerCase() || "";
      if (s.includes("fem") || s.startsWith("f")) return "Female";
      if (s.includes("mal") || s.startsWith("m")) return "Male";
      return "Other";
    }),
  patient_phone: z
    .string()
    .nullish()
    .transform((val) => val?.trim() || "+91-9876543210"),
  caregiver_name: z
    .string()
    .nullish()
    .transform((val) => val?.trim() || null),
  caregiver_relation: z
    .string()
    .nullish()
    .transform((val) => val?.trim() || null),
  caregiver_phone: z
    .string()
    .nullish()
    .transform((val) => val?.trim() || null),
  diagnosis: z
    .string()
    .nullish()
    .transform((val) => val?.trim() || "Clinical Condition (Doctor Review Required)"),
  medications: z
    .array(medicationSchema)
    .nullish()
    .transform((val) => val || []),
  medical_history: z
    .array(z.string())
    .nullish()
    .transform((val) => val || []),
  risk_factors: z
    .array(z.string())
    .nullish()
    .transform((val) => val || []),
  allergies: z
    .array(z.string())
    .nullish()
    .transform((val) => (val && val.length > 0 ? val : ["No known allergies recorded"])),
  follow_up_plan: z
    .string()
    .nullish()
    .transform((val) => val?.trim() || "Routine post-discharge clinical consultation"),
  suggested_department: z
    .string()
    .nullish()
    .transform((val) => val || null),
  confidence_notes: z
    .array(z.string())
    .nullish()
    .transform((val) => val || []),
});

export type ExtractedHistory = z.infer<typeof extractedHistorySchema>;

// Safe fallback for manual entry when extraction fails or input is unreadable
export const defaultManualFallback: ExtractedHistory = {
  patient_name: "Discharged Patient",
  age: 50,
  sex: "Male",
  patient_phone: "+91-9876543210",
  caregiver_name: null,
  caregiver_relation: null,
  caregiver_phone: null,
  diagnosis: "Unspecified Clinical Condition",
  medications: [],
  medical_history: [],
  risk_factors: [],
  allergies: ["No known allergies recorded"],
  follow_up_plan: "Routine 1-week post-discharge clinical consultation",
  suggested_department: null,
  confidence_notes: ["Automated extraction fallback activated. Please fill or review fields manually."],
};

const SYSTEM_INSTRUCTION = `You are an expert clinical documentation assistant.
Your task is to accurately extract structured demographic and clinical information from raw clinical notes, discharge summaries, or scanned medical records.

CRITICAL RULES:
1. Extract patient demographics if present:
   - patient_name (full name of patient)
   - age (numeric integer)
   - sex ("Male", "Female", or "Other")
   - patient_phone (phone or contact number, if stated)
   - caregiver_name / caregiver_relation / caregiver_phone (next of kin / relative, if stated)
2. Extract clinical details:
   - diagnosis (primary discharge diagnosis)
   - medications (list of active discharge prescriptions with name, dose, frequency)
   - medical_history (past medical/surgical history)
   - risk_factors (clinical complications or high readmission risks)
   - allergies (drug allergies or NKDA)
   - follow_up_plan (clinic review dates, red flag instructions)
   - suggested_department (e.g. Cardiology, Orthopaedics, Pulmonology, General Surgery)
3. Extract ONLY what is stated. NEVER invent medications or dosages.
4. Return your response strictly as valid JSON adhering to the required schema keys.`;

/**
 * Extracts structured medical history and demographics from raw text or uploaded media (PDF / image).
 */
export async function extractMedicalHistory(input: {
  rawText?: string;
  mediaFile?: {
    mimeType: string;
    base64Data: string;
  };
}): Promise<{ data: ExtractedHistory; error?: string; isFallback?: boolean }> {
  const contents: (string | InlineMediaPart)[] = [];

  if (input.mediaFile) {
    contents.push({
      inlineData: {
        mimeType: input.mediaFile.mimeType,
        data: input.mediaFile.base64Data,
      },
    });
  }

  const promptText = input.rawText
    ? `Please analyze and extract structured demographic and clinical history from the following discharge record:\n\n${input.rawText}`
    : `Please analyze and extract structured demographic and clinical history from the attached medical document.`;

  contents.push(promptText);

  // Attempt extraction
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const responseText = await generateGeminiContent({
        contents,
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      });

      let cleaned = responseText.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
      }

      const parsedJson = JSON.parse(cleaned);
      const validated = extractedHistorySchema.parse(parsedJson);

      return { data: validated };
    } catch (err: any) {
      console.warn(`Extraction attempt ${attempt} failed: ${err.message}`);
      if (attempt === 2) {
        return {
          data: defaultManualFallback,
          error: "AI extraction encountered an issue. Manual entry mode has been enabled for doctor review.",
          isFallback: true,
        };
      }
    }
  }

  return {
    data: defaultManualFallback,
    error: "AI extraction unavailable. Switched to manual entry.",
    isFallback: true,
  };
}

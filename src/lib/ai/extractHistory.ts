import { z } from "zod";
import { generateGeminiContent, InlineMediaPart } from "./gemini";

// ─── Zod Schema for Extracted Clinical History ──────────────────────────────
export const medicationSchema = z.object({
  name: z.string().describe("Medication brand or generic name"),
  dose: z.string().describe("Dosage with units e.g. 50mg, 1 tablet"),
  frequency: z.string().describe("Dosing frequency e.g. Once daily, twice daily after food"),
});

export type Medication = z.infer<typeof medicationSchema>;

export const extractedHistorySchema = z.object({
  diagnosis: z.string().describe("Primary discharge diagnosis or reason for admission"),
  medications: z.array(medicationSchema).default([]).describe("List of active discharge medications"),
  medical_history: z.array(z.string()).default([]).describe("Past medical history, surgical history, or chronic conditions"),
  risk_factors: z.array(z.string()).default([]).describe("Identified clinical risk factors e.g. hypertension, smoking, age > 65"),
  allergies: z.array(z.string()).default([]).describe("Known drug or food allergies, or 'NKDA / No known allergies'"),
  follow_up_plan: z.string().nullable().describe("Scheduled follow-up instructions, clinic visits, or milestone expectations"),
  suggested_department: z.string().nullable().describe("Suggested hospital department based on diagnosis (e.g. Cardiology, Orthopaedics, General Surgery, Pulmonology)"),
  confidence_notes: z.array(z.string()).default([]).describe("Clinical ambiguities, unclear dosages, or low-confidence extractions flagged for the reviewing doctor"),
});

export type ExtractedHistory = z.infer<typeof extractedHistorySchema>;

// Safe fallback for manual entry when extraction fails or input is unreadable
export const defaultManualFallback: ExtractedHistory = {
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
Your task is to accurately extract structured post-discharge medical information from raw clinical notes, discharge summaries, or scanned medical records.

CRITICAL RULES:
1. Extract ONLY what is explicitly stated in the provided text or document.
2. NEVER invent, hallucinate, or extrapolate diagnoses, medications, or dosages.
3. If information for a field is missing, use null or "Not stated in record".
4. If a dosage or frequency is ambiguous, note this ambiguity in confidence_notes.
5. If the patient's condition clearly corresponds to a specialized medical unit (such as Cardiology, Orthopaedics, Pulmonology, General Surgery, Neurology), suggest it in suggested_department. Otherwise use null.
6. Return your response strictly as valid JSON adhering to the required schema.`;

/**
 * Extracts structured medical history from raw text or uploaded media (PDF / image).
 * Retries once on invalid JSON, then returns fallback with error flag.
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
    ? `Please analyze and extract structured clinical history from the following discharge record:\n\n${input.rawText}`
    : `Please analyze and extract structured clinical history from the attached medical document.`;

  contents.push(promptText);

  // Attempt 1: Call Gemini with JSON response constraint
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const responseText = await generateGeminiContent({
        contents,
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      });

      // Parse JSON
      const parsedJson = JSON.parse(responseText);
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

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
5. If the patient's condition clearly corresponds to a specialized medical unit (such as Cardiology, Orthopaedics, Pulmonology, General Surgery, Oncology), suggest it in suggested_department. Otherwise use null.
6. Return your response strictly as valid JSON adhering to the required schema keys:
   {
     "diagnosis": "string",
     "medications": [{"name": "string", "dose": "string", "frequency": "string"}],
     "medical_history": ["string"],
     "risk_factors": ["string"],
     "allergies": ["string"],
     "follow_up_plan": "string",
     "suggested_department": "string or null",
     "confidence_notes": ["string"]
   }`;

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

  // Attempt extraction
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const responseText = await generateGeminiContent({
        contents,
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      });

      // Parse JSON
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

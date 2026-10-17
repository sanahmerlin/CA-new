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
  patient_age: z
    .coerce
    .number()
    .nullish()
    .transform((val) => (val && val > 0 && val < 130 ? val : null)),
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
  patient_age: 50,
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
1. MANDATORY PATIENT NAME:
   - Search the ENTIRE document (headers, metadata, "Patient:", "Pt:", "Name:", "Client:", "Subject:", narrative notes like "Mr. Smith", "Mary is a 64yo female...").
   - Extract the patient's full name into "patient_name".
   - If the name is listed as "LastName, FirstName", convert it to "FirstName LastName" (e.g. "Gupta, Rameshwar" -> "Rameshwar Gupta").
   - Only use "Discharged Patient" if the document is strictly anonymized with absolutely no personal identifiers or titles.

2. DEMOGRAPHICS:
   - age: integer number (extract from "64yo", "Age: 64", "64 years old", or calculate from DOB if discharge date is present).
   - sex: "Male" or "Female" or "Other" (derive from "M", "F", "Male", "Female", or pronouns "he/his", "she/her").
   - patient_phone: phone or contact number if stated, otherwise null.

3. CAREGIVER / EMERGENCY CONTACT:
   - caregiver_name: next of kin, emergency contact, or family member name if stated.
   - caregiver_relation: relation (e.g. "Spouse", "Son", "Daughter", "Wife", "Husband", "Relative").
   - caregiver_phone: contact number if stated.

4. CLINICAL DETAILS:
   - diagnosis: primary discharge diagnosis or admission condition.
   - medications: list of discharge prescriptions with name, dose, frequency.
   - medical_history: past chronic conditions, comorbidities, or surgical history.
   - risk_factors: complications or high readmission risks.
   - allergies: drug or food allergies.
   - follow_up_plan: specific clinic review timeline.
   - suggested_department: Cardiology, Orthopaedics, Pulmonology, General Surgery, Oncology.

5. OUTPUT FORMAT:
   Return STRICTLY a JSON object matching this exact flat structure:
   {
     "patient_name": "Full Patient Name",
     "age": 64,
     "sex": "Male",
     "patient_phone": "+91-...",
     "caregiver_name": "Relative Name or null",
     "caregiver_relation": "Relationship or null",
     "caregiver_phone": "Phone or null",
     "diagnosis": "Primary diagnosis",
     "medications": [{"name": "string", "dose": "string", "frequency": "string"}],
     "medical_history": ["string"],
     "risk_factors": ["string"],
     "allergies": ["string"],
     "follow_up_plan": "string",
     "suggested_department": "Cardiology"
   }`;

/**
 * Normalizes variations in model output (e.g. nested objects or alternative key names)
 */
function normalizeExtractedJson(raw: any, fallbackFilename?: string): any {
  if (!raw || typeof raw !== "object") return raw;

  // 1. Resolve patient name from all possible nested or alternate keys
  let name =
    raw.patient_name ||
    raw.patientName ||
    raw.name ||
    raw.full_name ||
    raw.fullName ||
    raw.patient?.name ||
    raw.patient?.full_name ||
    raw.patient?.patient_name ||
    raw.demographics?.name ||
    raw.demographics?.patient_name ||
    raw.demographics?.full_name ||
    raw.pt_name ||
    null;

  // If name is generic or missing, check if filename has something like "John_Doe_Discharge.pdf"
  if (
    (!name ||
      name.toLowerCase().includes("patient #") ||
      name.toLowerCase() === "discharged patient" ||
      name.toLowerCase() === "unknown" ||
      name.toLowerCase() === "n/a") &&
    fallbackFilename
  ) {
    const cleanFile = fallbackFilename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").trim();
    const cleanedWords = cleanFile
      .split(/\s+/)
      .filter(
        (w) =>
          !/^(discharge|summary|notes|clinical|record|hospital|sheet|dr|sister|dept|opd|patient|test|pdf|txt)$/i.test(
            w
          )
      )
      .join(" ");
    if (cleanedWords.length > 2) {
      name = cleanedWords;
    }
  }

  // 2. Resolve age
  let age =
    raw.age ??
    raw.patient?.age ??
    raw.demographics?.age ??
    raw.patient_age ??
    null;

  if (typeof age === "string") {
    const match = age.match(/\d+/);
    age = match ? parseInt(match[0], 10) : null;
  }

  // 3. Resolve sex / gender
  let sex =
    raw.sex ||
    raw.gender ||
    raw.patient?.sex ||
    raw.patient?.gender ||
    raw.demographics?.sex ||
    raw.demographics?.gender ||
    null;

  // 4. Resolve phone
  let phone =
    raw.patient_phone ||
    raw.phone ||
    raw.contact ||
    raw.mobile ||
    raw.telephone ||
    raw.patient?.phone ||
    raw.demographics?.phone ||
    raw.demographics?.contact ||
    null;

  // 5. Resolve caregiver info
  let cgName =
    raw.caregiver_name ||
    raw.caregiver?.name ||
    raw.next_of_kin?.name ||
    raw.emergency_contact?.name ||
    null;

  let cgRel =
    raw.caregiver_relation ||
    raw.caregiver?.relation ||
    raw.next_of_kin?.relation ||
    raw.emergency_contact?.relation ||
    null;

  let cgPhone =
    raw.caregiver_phone ||
    raw.caregiver?.phone ||
    raw.next_of_kin?.phone ||
    raw.emergency_contact?.phone ||
    null;

  // 6. Resolve diagnosis
  let diagnosis =
    raw.diagnosis ||
    raw.primary_diagnosis ||
    raw.discharge_diagnosis ||
    raw.clinical_diagnosis ||
    raw.condition ||
    raw.clinical_details?.diagnosis ||
    null;

  return {
    ...raw,
    patient_name: name,
    patient_age: age,
    age: age,
    sex: sex,
    patient_phone: phone,
    caregiver_name: cgName,
    caregiver_relation: cgRel,
    caregiver_phone: cgPhone,
    diagnosis: diagnosis,
    medications:
      raw.medications || raw.prescriptions || raw.discharge_medications || raw.drugs || [],
    medical_history:
      raw.medical_history || raw.past_medical_history || raw.history || [],
    risk_factors: raw.risk_factors || raw.risks || raw.complications || [],
    allergies: raw.allergies || raw.known_allergies || [],
    follow_up_plan:
      raw.follow_up_plan || raw.follow_up || raw.plan || raw.instructions || null,
    suggested_department: raw.suggested_department || raw.department || null,
  };
}

/**
 * Extracts structured medical history and demographics from raw text or uploaded media (PDF / image).
 */
export async function extractMedicalHistory(input: {
  rawText?: string;
  mediaFile?: {
    mimeType: string;
    base64Data: string;
  };
  filename?: string;
  fallbackBasics?: {
    name?: string;
    age?: number;
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
    : `Please analyze and extract structured demographic and clinical history from the attached medical document. Ensure patient name, age, and sex are thoroughly extracted.`;

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
      const normalized = normalizeExtractedJson(parsedJson, input.filename);
      const validated = extractedHistorySchema.parse(normalized);

      // If document did not state patient_name or patient_age, fall back to Step 1 basics
      if (
        (!validated.patient_name ||
          validated.patient_name === "Discharged Patient" ||
          validated.patient_name.toLowerCase().includes("patient #")) &&
        input.fallbackBasics?.name
      ) {
        validated.patient_name = input.fallbackBasics.name.trim();
      }

      if ((!validated.patient_age || validated.patient_age === 50) && input.fallbackBasics?.age) {
        validated.patient_age = input.fallbackBasics.age;
        validated.age = input.fallbackBasics.age;
      }

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

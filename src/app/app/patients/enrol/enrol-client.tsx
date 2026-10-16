"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  FileText,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Upload,
  AlertCircle,
  Plus,
  Trash2,
  Building2,
  Calendar,
  Phone,
  ShieldAlert,
  ArrowRight,
  Info,
} from "lucide-react";
import { enrolPatient } from "../actions";
import type { ExtractedHistory, Medication } from "@/lib/ai/extractHistory";

interface Department {
  id: string;
  name: string;
}

const SAMPLE_NOTES = [
  {
    title: "Post-CABG Patient (Cardiac Surgery)",
    text: `DISCHARGE SUMMARY
Patient: Rajesh Sharma, 62M
Admitted: 10/10/2026, Discharged: 16/10/2026
Diagnosis: Post Coronary Artery Bypass Graft (CABG x 3) for Severe Triple Vessel Disease.
Past History: Type 2 Diabetes Mellitus x 12 years, Essential Hypertension, Dyslipidemia.
Medications at Discharge:
1. Tab Aspirin 75mg once daily after breakfast
2. Tab Clopidogrel 75mg once daily
3. Tab Atorvastatin 40mg at bedtime
4. Tab Metoprolol succinate 25mg once daily (monitor heart rate)
5. Tab Metformin 500mg twice daily with meals
Allergies: NKDA (No known drug allergies).
Risk Factors: Diabetic, smoker (quit 2 months prior), post-sternotomy sternal healing risk.
Follow-up Plan: Suture removal and wound inspection in CTVS OPD in 7 days. Echocardiogram in 4 weeks. Report immediately if chest wound redness, fever > 100F, or sudden breathlessness.`,
  },
  {
    title: "Heart Failure Decompensation",
    text: `CLINICAL DISCHARGE NOTE
Patient: Mary Varghese, 71F
Diagnosis: Acute Decompensated Heart Failure with reduced ejection fraction (HFrEF, EF 32%), resolved pulmonary edema.
Medical History: Dilated cardiomyopathy, Chronic Kidney Disease Stage 3a.
Discharge Medications:
- Furosemide 40mg twice daily (morning & 2pm)
- Sacubitril/Valsartan (Entresto) 24/26mg twice daily
- Spironolactone 25mg once daily
- Empagliflozin 10mg once daily morning
Allergies: Penicillin (develops urticarial rash).
Risk Factors: High readmission risk, fluid overload, orthopnea, hyperkalemia risk.
Plan: Cardiology review with serum electrolytes & creatinine in 5 days. Daily morning weight check (alert hospital if weight increases > 1.5kg in 2 days). Strict 1.5L fluid restriction.`,
  },
  {
    title: "Total Hip Arthroplasty (Orthopaedics)",
    text: `SURGICAL DISCHARGE SHEET
Patient: Sundararajan K, 58M
Department: Orthopaedics
Diagnosis: Severe Right Hip Osteoarthritis s/p Right Uncemented Total Hip Replacement (THR).
Medical History: Osteoarthritis, Mild asthma.
Discharge Medications:
- Tab Enoxaparin 40mg SC once daily for 14 days (DVT prophylaxis)
- Tab Paracetamol 1000mg thrice daily as needed for pain
- Tab Tramadol 50mg SOS for breakthrough pain
- Tab Pantoprazole 40mg once daily before breakfast
Allergies: Sulfa drugs (facial swelling).
Risk Factors: Deep vein thrombosis (DVT) risk, post-surgical fall risk.
Follow-up: Ortho OPD visit on Day 12 for wound dressing and staple removal. Daily walker-assisted physiotherapy. Report calf swelling or sudden pain immediately.`,
  },
];

export function EnrolClient({ departments }: { departments: Department[] }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Basics
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [sex, setSex] = useState<string>("Male");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || "");
  const [dischargeDate, setDischargeDate] = useState(new Date().toISOString().split("T")[0]);
  const [patientPhone, setPatientPhone] = useState("+91-");
  const [caregiverName, setCaregiverName] = useState("");
  const [caregiverRelation, setCaregiverRelation] = useState("Spouse");
  const [caregiverPhone, setCaregiverPhone] = useState("");

  // Step 2: History Input
  const [rawText, setRawText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  // Step 3: Review & Edit
  const [diagnosis, setDiagnosis] = useState("");
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicalHistory, setMedicalHistory] = useState<string[]>([]);
  const [riskFactors, setRiskFactors] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [followUpPlan, setFollowUpPlan] = useState("");
  const [suggestedDept, setSuggestedDept] = useState<string | null>(null);
  const [confidenceNotes, setConfidenceNotes] = useState<string[]>([]);
  const [isFallback, setIsFallback] = useState(false);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Run AI Extraction
  const handleExtract = async () => {
    if (!rawText.trim() && !file) {
      setExtractionError("Please paste clinical notes or choose a medical record file.");
      return;
    }

    setIsExtracting(true);
    setExtractionError(null);

    try {
      const formData = new FormData();
      if (rawText.trim()) formData.append("rawText", rawText);
      if (file) formData.append("file", file);

      const res = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok || result.error) {
        setExtractionError(result.error || "Extraction failed. Continuing with manual entry.");
      }

      const extracted: ExtractedHistory = result.data;
      setDiagnosis(extracted.diagnosis || "");
      setMedications(extracted.medications || []);
      setMedicalHistory(extracted.medical_history || []);
      setRiskFactors(extracted.risk_factors || []);
      setAllergies(extracted.allergies || []);
      setFollowUpPlan(extracted.follow_up_plan || "");
      setSuggestedDept(extracted.suggested_department || null);
      setConfidenceNotes(extracted.confidence_notes || []);
      setIsFallback(Boolean(result.isFallback));

      setStep(3);
    } catch (err: any) {
      setExtractionError("Network error contacting extraction service. Switched to manual entry.");
      setStep(3);
    } finally {
      setIsExtracting(false);
    }
  };

  // Submit Final Enrollment
  const handleConfirm = async () => {
    if (!diagnosis.trim()) {
      setSubmitError("Primary diagnosis is required.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      full_name: fullName,
      age: Number(age) || 0,
      sex,
      department_id: departmentId,
      discharge_date: dischargeDate,
      patient_phone: patientPhone,
      caregiver_name: caregiverName.trim() || undefined,
      caregiver_relation: caregiverRelation.trim() || undefined,
      caregiver_phone: caregiverPhone.trim() || undefined,
      raw_history_text: rawText.trim() || undefined,
      diagnosis,
      medications,
      medical_history: medicalHistory,
      risk_factors: riskFactors,
      allergies,
      follow_up_plan: followUpPlan,
    };

    const res = await enrolPatient(payload);
    setIsSubmitting(false);

    if (res.error) {
      setSubmitError(res.error);
    } else if (res.patientId) {
      router.push(`/app/patients/${res.patientId}`);
    }
  };

  // Medication handlers in step 3
  const addMedication = () => {
    setMedications([...medications, { name: "", dose: "", frequency: "" }]);
  };

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Stepper Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Enrol Discharged Patient
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Step {step} of 3 • AI-powered history extraction & clinical onboarding
            </p>
          </div>
          <Link
            href="/app/patients"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Cancel
          </Link>
        </div>

        {/* Progress Bar & Steps Indicator */}
        <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div
            className={`flex items-center gap-2.5 p-2 rounded-lg text-xs font-semibold ${
              step === 1
                ? "bg-teal-50 text-teal-800 border border-teal-200"
                : step > 1
                ? "text-emerald-700 bg-emerald-50"
                : "text-slate-400"
            }`}
          >
            <div
              className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step >= 1 ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-600"
              }`}
            >
              1
            </div>
            <span>Basics & Contacts</span>
          </div>

          <div
            className={`flex items-center gap-2.5 p-2 rounded-lg text-xs font-semibold ${
              step === 2
                ? "bg-teal-50 text-teal-800 border border-teal-200"
                : step > 2
                ? "text-emerald-700 bg-emerald-50"
                : "text-slate-400"
            }`}
          >
            <div
              className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step >= 2 ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-600"
              }`}
            >
              2
            </div>
            <span>Raw History & AI</span>
          </div>

          <div
            className={`flex items-center gap-2.5 p-2 rounded-lg text-xs font-semibold ${
              step === 3
                ? "bg-teal-50 text-teal-800 border border-teal-200"
                : "text-slate-400"
            }`}
          >
            <div
              className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === 3 ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-600"
              }`}
            >
              3
            </div>
            <span>Doctor Review</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* STEP 1: BASICS                                                      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Patient & Hospital Routing</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter primary demographic details and assign to a clinical department.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Age *</label>
              <input
                type="number"
                required
                placeholder="65"
                min="1"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sex *</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hospital Department *
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Discharge Date *
              </label>
              <input
                type="date"
                required
                value={dischargeDate}
                onChange={(e) => setDischargeDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Patient Phone / WhatsApp Number *
              </label>
              <input
                type="text"
                required
                placeholder="+91-9876543210"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Caregiver Escalation Section */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span>Caregiver / Relative Escalation Contact</span>
                <span className="text-[10px] font-normal text-slate-400 capitalize">(Optional)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Used if the patient misses a check-in.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Caregiver Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sunita Sharma"
                  value={caregiverName}
                  onChange={(e) => setCaregiverName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Relation</label>
                <input
                  type="text"
                  placeholder="e.g. Spouse / Son / Daughter"
                  value={caregiverRelation}
                  onChange={(e) => setCaregiverRelation(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Caregiver Phone
                </label>
                <input
                  type="text"
                  placeholder="+91-9123456780"
                  value={caregiverPhone}
                  onChange={(e) => setCaregiverPhone(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              disabled={!fullName.trim() || !age || !patientPhone.trim()}
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              <span>Continue to Clinical History</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* STEP 2: RAW CLINICAL HISTORY & GEMINI EXTRACTION                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Clinical History & Discharge Record</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste unstructured medical notes, discharge summary text, or upload a scanned PDF/image. Gemini will automatically extract medications, risks, and follow-up plans.
            </p>
          </div>

          {extractionError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{extractionError}</span>
            </div>
          )}

          {/* Quick Sample Notes for Demo */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-teal-600" />
              <span className="text-xs font-bold text-slate-800">
                Quick Demo: Load Ready-to-Paste Sample Notes
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SAMPLE_NOTES.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setRawText(sample.text);
                    setExtractionError(null);
                  }}
                  className="text-left p-2.5 rounded-lg border border-slate-200 hover:border-teal-400 hover:bg-white bg-white/70 text-xs transition-colors"
                >
                  <div className="font-semibold text-slate-800 truncate">{sample.title}</div>
                  <span className="text-[11px] text-teal-600 font-medium">Click to paste</span>
                </button>
              ))}
            </div>
          </div>

          {/* Large Textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Unstructured Clinical Notes / Discharge Summary
            </label>
            <textarea
              rows={8}
              placeholder="Paste discharge summary, clinical history, medications, surgery details, allergies, and follow-up plan here..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full px-3.5 py-3 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* File Upload (txt, pdf, image) */}
          <div className="border border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors">
            <Upload className="h-6 w-6 text-slate-400 mx-auto mb-2" />
            <label className="cursor-pointer">
              <span className="text-xs font-bold text-teal-600 hover:underline">
                Upload scanned record or PDF
              </span>
              <input
                type="file"
                accept=".txt,.pdf,image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  if (e.target.files?.[0]) setFile(e.target.files[0]);
                }}
                className="hidden"
              />
            </label>
            <p className="text-[11px] text-slate-400 mt-1">Supports TXT, PDF, PNG, JPEG</p>
            {file && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-teal-50 text-teal-700 text-xs font-semibold border border-teal-200">
                <span>{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-slate-400 hover:text-red-500 ml-1"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Basics</span>
            </button>

            <button
              type="button"
              disabled={isExtracting || (!rawText.trim() && !file)}
              onClick={handleExtract}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              <span>{isExtracting ? "Extracting with Gemini..." : "Extract with Gemini AI"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* STEP 3: DOCTOR REVIEW & CONFIRMATION                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Doctor Review & Record Confirmation
                </h2>
                {isFallback ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    Manual Fallback
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    AI Extracted
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and modify extracted fields. Nothing is saved to patient records until you confirm.
              </p>
            </div>

            {/* Department Routing Suggestion Badge */}
            {suggestedDept && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-xs">
                <span className="text-slate-500 font-medium block">AI Suggested Department:</span>
                <span className="font-bold text-blue-900">{suggestedDept}</span>
              </div>
            )}
          </div>

          {/* Low Confidence / Clinical Ambiguities Alert */}
          {confidenceNotes.length > 0 && (
            <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Clinical Notes & Ambiguities Flagged for Doctor:</span>
              </div>
              <ul className="list-disc list-inside text-xs text-amber-700 space-y-0.5 pl-1">
                {confidenceNotes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {submitError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Section 1: Diagnosis */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Primary Diagnosis *
            </label>
            <input
              type="text"
              required
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
            />
          </div>

          {/* Section 2: Medications Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Discharge Medications ({medications.length})
              </label>
              <button
                type="button"
                onClick={addMedication}
                className="inline-flex items-center gap-1 text-xs text-teal-600 font-bold hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Medication
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Medication Name</th>
                    <th className="py-2.5 px-3">Dose</th>
                    <th className="py-2.5 px-3">Frequency</th>
                    <th className="py-2.5 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {medications.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-400 italic">
                        No medications added. Click "Add Medication" to include prescriptions.
                      </td>
                    </tr>
                  ) : (
                    medications.map((med, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="e.g. Aspirin"
                            value={med.name}
                            onChange={(e) => updateMedication(idx, "name", e.target.value)}
                            className="w-full px-2.5 py-1 rounded border border-slate-200 focus:outline-none focus:border-teal-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="e.g. 75mg"
                            value={med.dose}
                            onChange={(e) => updateMedication(idx, "dose", e.target.value)}
                            className="w-full px-2.5 py-1 rounded border border-slate-200 focus:outline-none focus:border-teal-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="e.g. Once daily"
                            value={med.frequency}
                            onChange={(e) => updateMedication(idx, "frequency", e.target.value)}
                            className="w-full px-2.5 py-1 rounded border border-slate-200 focus:outline-none focus:border-teal-500"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeMedication(idx)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Medical History & Risk Factors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Medical & Surgical History (comma separated)
              </label>
              <textarea
                rows={3}
                value={medicalHistory.join(", ")}
                onChange={(e) =>
                  setMedicalHistory(
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Risk Factors (comma separated)
              </label>
              <textarea
                rows={3}
                value={riskFactors.join(", ")}
                onChange={(e) =>
                  setRiskFactors(
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Section 4: Allergies & Follow-up Plan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Allergies (comma separated)
              </label>
              <input
                type="text"
                value={allergies.join(", ")}
                onChange={(e) =>
                  setAllergies(
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Follow-up Plan & Consultations
              </label>
              <textarea
                rows={2}
                value={followUpPlan}
                onChange={(e) => setFollowUpPlan(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to History Input</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting || !diagnosis.trim()}
              onClick={handleConfirm}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isSubmitting ? "Saving & Enrolling..." : "Confirm & Enrol Patient"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

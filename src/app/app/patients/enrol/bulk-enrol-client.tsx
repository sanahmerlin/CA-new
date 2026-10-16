"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileText,
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ChevronDown,
  ChevronUp,
  Plus,
  Loader2,
  ArrowRight,
  Info,
  Layers,
} from "lucide-react";
import { enrolBatchPatients, EnrolPatientPayload } from "../actions";
import type { ExtractedHistory, Medication } from "@/lib/ai/extractHistory";
import type { BatchExtractionResult } from "@/app/api/extract/batch/route";

interface Department {
  id: string;
  name: string;
}

interface EditableBatchPatient {
  id: string; // local client id
  filename: string;
  fullName: string;
  age: number;
  sex: string;
  patientPhone: string;
  caregiverName: string;
  caregiverRelation: string;
  caregiverPhone: string;
  departmentId: string;
  dischargeDate: string;
  diagnosis: string;
  medications: Medication[];
  medicalHistory: string[];
  riskFactors: string[];
  allergies: string[];
  followUpPlan: string;
  isFallback?: boolean;
  error?: string;
  expanded?: boolean;
}

const DEMO_BATCH_RECORDS = [
  {
    name: "Dr. K. Sharma_Discharge_Cardiology.txt",
    text: `DISCHARGE SUMMARY - SUNRISE HEART INSTITUTE
Patient Name: Rameshwar K. Gupta
Age: 64 | Sex: Male | Phone: +91-9845012345
Department: Cardiology
Caregiver: Anita Gupta (Wife), +91-9845012346
Admission Date: 10/10/2026 | Discharge Date: 16/10/2026

Discharge Diagnosis:
Non-ST Elevation Myocardial Infarction (NSTEMI) s/p Percutaneous Coronary Intervention (PCI) with Drug-Eluting Stent (DES) to proximal LAD.

Discharge Prescriptions:
1. Tab Ticagrelor 90mg twice daily
2. Tab Aspirin 75mg once daily post breakfast
3. Tab Rosuvastatin 40mg at bedtime
4. Tab Bisoprolol 2.5mg once daily morning
5. Tab Ramipril 2.5mg once daily

Medical History: Long-standing Hypertension, Dyslipidemia.
Allergies: NKDA (No known drug allergies).
Risk Factors: Post-stent thrombosis risk, sedentary lifestyle.
Follow-up Plan: Cardiology OPD review with ECG in 7 days. Strict low-salt, low-fat cardiac diet.`,
  },
  {
    name: "Sister_Mary_Ortho_Discharge.txt",
    text: `DEPARTMENT OF ORTHOPAEDICS & JOINT REPLACEMENT
DISCHARGE NOTES
Patient: Preeti Nair
Age: 58 | Sex: Female | Phone: +91-9711223344
Emergency Contact / Son: Arjun Nair (+91-9711223345)
Discharge Date: 16/10/2026

Diagnosis:
Right Knee Severe Tricompartmental Osteoarthritis s/p Right Total Knee Arthroplasty (TKA).

Discharge Prescriptions:
- Tab Enoxaparin 40mg SC once daily x 10 days
- Tab Paracetamol 1000mg TDS for 5 days
- Tab Tramadol 37.5mg + Acetaminophen SOS for breakthrough pain
- Tab Pantoprazole 40mg OD before food

Allergies: Codeine (severe nausea/dizziness).
Risk Factors: Fall risk, postoperative deep vein thrombosis (DVT) risk.
Follow-up: Knee wound inspection and dressing in Ortho OPD on Day 10. Regular isometric knee physiotherapy.`,
  },
  {
    name: "Discharge_Pulmo_COPD_Exac.txt",
    text: `DEPARTMENT OF PULMONOLOGY & CHEST MEDICINE
CLINICAL DISCHARGE RECORD
Patient: Anthony Fernandez
Age: 69 | Sex: Male | Contact: +91-9820055443
Caregiver: David Fernandez (Son), +91-9820055444
Discharge Date: 16/10/2026

Primary Diagnosis:
Acute Exacerbation of Chronic Obstructive Pulmonary Disease (AECOPD - GOLD Stage 3), Resolved Type II Respiratory Failure.

Discharge Medications:
1. Budesonide + Formoterol 400/12mcg DPI 2 puffs twice daily with spacer
2. Tiotropium 18mcg inhaler 1 puff once daily
3. Tab Prednisolone 20mg once daily for 5 days then stop
4. Tab Azithromycin 500mg once daily for 3 days

Allergies: Penicillin (urticaria).
Risk Factors: Chronic hypoxia, active ex-smoker (40 pack-years), high risk of winter infection.
Follow-up: Pulmonology OPD in 2 weeks with Spirometry review. Maintain portable pulse oximeter monitoring.`,
  },
];

export function BulkEnrolClient({ departments }: { departments: Department[] }) {
  const router = useRouter();

  const [files, setFiles] = useState<File[]>([]);
  const [demoTexts, setDemoTexts] = useState<{ name: string; text: string }[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState("");
  const [extractionError, setExtractionError] = useState<string | null>(null);

  // Extracted patient list ready for review & editing
  const [stagedPatients, setStagedPatients] = useState<EditableBatchPatient[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Helper to match department name to existing department ID
  const matchDepartmentId = (suggested: string | null | undefined): string => {
    if (!suggested) return departments[0]?.id || "";
    const lower = suggested.toLowerCase();
    const matched = departments.find(
      (d) =>
        d.name.toLowerCase().includes(lower) ||
        lower.includes(d.name.toLowerCase())
    );
    return matched ? matched.id : departments[0]?.id || "";
  };

  // Add files from file picker
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selected].slice(0, 10));
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Load Demo Batch
  const loadDemoBatch = () => {
    setDemoTexts(DEMO_BATCH_RECORDS);
    setFiles([]);
    setExtractionError(null);
  };

  const clearStaged = () => {
    setFiles([]);
    setDemoTexts([]);
    setStagedPatients([]);
    setExtractionError(null);
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  // Run AI Batch Extraction
  const handleBatchExtract = async () => {
    const totalCount = files.length + demoTexts.length;
    if (totalCount === 0) {
      setExtractionError("Please select files or load the demo records to start extraction.");
      return;
    }

    setIsExtracting(true);
    setExtractionProgress(`Analyzing ${totalCount} records concurrently with Gemini AI...`);
    setExtractionError(null);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      demoTexts.forEach((d) => formData.append("texts", d.text));

      const res = await fetch("/api/extract/batch", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || "Batch extraction failed.");
      }

      const results: BatchExtractionResult[] = json.results || [];

      // Convert results to editable patient rows
      const converted: EditableBatchPatient[] = results.map((item, idx) => {
        const d: ExtractedHistory = item.data;
        return {
          id: `batch-${Date.now()}-${idx}`,
          filename: item.filename,
          fullName: d.patient_name || `Patient #${idx + 1}`,
          age: d.age || 50,
          sex: d.sex || "Other",
          patientPhone: d.patient_phone || "+91-9876543210",
          caregiverName: d.caregiver_name || "",
          caregiverRelation: d.caregiver_relation || "Spouse",
          caregiverPhone: d.caregiver_phone || "",
          departmentId: matchDepartmentId(d.suggested_department),
          dischargeDate: new Date().toISOString().split("T")[0],
          diagnosis: d.diagnosis || "Unspecified Clinical Condition",
          medications: d.medications || [],
          medicalHistory: d.medical_history || [],
          riskFactors: d.risk_factors || [],
          allergies: d.allergies || [],
          followUpPlan: d.follow_up_plan || "Post-discharge clinical review",
          isFallback: item.isFallback,
          error: item.error,
          expanded: false,
        };
      });

      setStagedPatients(converted);
    } catch (err: any) {
      console.error("Batch extraction failed:", err);
      setExtractionError(err.message || "Extraction service temporarily unavailable.");
    } finally {
      setIsExtracting(false);
      setExtractionProgress("");
    }
  };

  // Modify individual patient field
  const updatePatient = (id: string, updates: Partial<EditableBatchPatient>) => {
    setStagedPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  // Delete individual patient row
  const deletePatient = (id: string) => {
    setStagedPatients((prev) => prev.filter((p) => p.id !== id));
  };

  // Add empty manual row
  const addBlankRow = () => {
    const newPatient: EditableBatchPatient = {
      id: `batch-manual-${Date.now()}`,
      filename: "Manual Entry",
      fullName: "New Patient",
      age: 55,
      sex: "Male",
      patientPhone: "+91-9876543210",
      caregiverName: "",
      caregiverRelation: "Relative",
      caregiverPhone: "",
      departmentId: departments[0]?.id || "",
      dischargeDate: new Date().toISOString().split("T")[0],
      diagnosis: "Post-operative follow-up",
      medications: [],
      medicalHistory: [],
      riskFactors: [],
      allergies: ["No known drug allergies"],
      followUpPlan: "Routine follow-up in 10 days",
      expanded: true,
    };
    setStagedPatients((prev) => [...prev, newPatient]);
  };

  // Submit all staged patients in single transaction
  const handleConfirmBatch = async () => {
    if (stagedPatients.length === 0) return;

    // Validate names and diagnosis
    const invalid = stagedPatients.find(
      (p) => !p.fullName.trim() || !p.diagnosis.trim()
    );
    if (invalid) {
      setSubmitError(
        `Patient "${invalid.fullName || "Unnamed"}" must have both a full name and a diagnosis.`
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const payloads: EnrolPatientPayload[] = stagedPatients.map((p) => ({
      full_name: p.fullName.trim(),
      age: Number(p.age) || 50,
      sex: p.sex,
      department_id: p.departmentId,
      discharge_date: p.dischargeDate,
      patient_phone: p.patientPhone.trim(),
      caregiver_name: p.caregiverName.trim() || undefined,
      caregiver_relation: p.caregiverRelation.trim() || undefined,
      caregiver_phone: p.caregiverPhone.trim() || undefined,
      raw_history_text: `Batch Enrolment from file: ${p.filename}`,
      diagnosis: p.diagnosis.trim(),
      medications: p.medications,
      medical_history: p.medicalHistory,
      risk_factors: p.riskFactors,
      allergies: p.allergies,
      follow_up_plan: p.followUpPlan.trim() || undefined,
    }));

    const res = await enrolBatchPatients(payloads);
    setIsSubmitting(false);

    if (res.error) {
      setSubmitError(res.error);
    } else {
      setSubmitSuccess(
        `Successfully enrolled ${res.count} patients! Redirecting to patient directory...`
      );
      setTimeout(() => {
        router.push("/app/patients");
      }, 1500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Informational Header */}
      <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-cyan-500/10 border border-teal-200/60 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="p-2.5 bg-teal-600 text-white rounded-lg shadow-sm shrink-0 mt-0.5">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Bulk Patient Onboarding & AI Extraction
            </h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Upload multiple patient discharge summaries or clinical sheets (PDF, TXT, images) at once.
              Gemini AI extracts demographics, diagnoses, and medication regimens in parallel, letting clinical
              staff review and confirm all patients in a single unified view.
            </p>
          </div>
        </div>
      </div>

      {/* Step 1: File Dropzone & Selection (if not yet staged) */}
      {stagedPatients.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Select Multiple Discharge Records</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload up to 10 files per batch or test instantly with realistic hospital records.
              </p>
            </div>

            <button
              type="button"
              onClick={loadDemoBatch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold rounded-lg border border-teal-200 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Load 3 Demo Records</span>
            </button>
          </div>

          {/* Drag & Drop Area */}
          <label className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-teal-50/20 group">
            <div className="p-3 bg-white rounded-full shadow-xs border border-slate-200 group-hover:border-teal-300 group-hover:scale-105 transition-all">
              <UploadCloud className="h-6 w-6 text-teal-600" />
            </div>
            <p className="text-sm font-medium text-slate-800 mt-3">
              Click to select files or drag and drop
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports PDF, TXT, PNG, JPG, WEBP (discharge summaries, typed notes, hospital discharge slips)
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.txt,.png,.jpg,.jpeg,.webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {/* Staged Files / Demo List */}
          {(files.length > 0 || demoTexts.length > 0) && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Staged Records ({files.length + demoTexts.length})
                </span>
                <button
                  type="button"
                  onClick={clearStaged}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium"
                >
                  Clear All
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {demoTexts.map((item, idx) => (
                  <div
                    key={`demo-${idx}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-teal-200 bg-teal-50/50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-teal-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">
                          {item.name}
                        </p>
                        <span className="text-[10px] text-teal-700 font-medium">Demo Hospital Record</span>
                      </div>
                    </div>
                  </div>
                ))}

                {files.map((file, idx) => (
                  <div
                    key={`file-${idx}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">
                          {file.name}
                        </p>
                        <span className="text-[10px] text-slate-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Extraction Trigger */}
              <div className="pt-4 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleBatchExtract}
                  disabled={isExtracting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{extractionProgress || "Extracting..."}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>
                        Extract {files.length + demoTexts.length} Patient
                        {files.length + demoTexts.length > 1 ? "s" : ""} with AI
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {extractionError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-700 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{extractionError}</span>
            </div>
          )}
        </div>
      ) : (
        /* Step 2: Batch Review & Inline Edit Table */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Batch Review Table ({stagedPatients.length} Patients)
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                  AI Extracted
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Review, modify, or add missing details. Click any row to expand medications and risk factors.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addBlankRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Row</span>
              </button>

              <button
                type="button"
                onClick={clearStaged}
                className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1.5"
              >
                Discard Batch
              </button>
            </div>
          </div>

          {/* Patient Rows */}
          <div className="space-y-3">
            {stagedPatients.map((patient, index) => (
              <div
                key={patient.id}
                className={`bg-white rounded-xl border transition-all shadow-xs ${
                  patient.expanded
                    ? "border-teal-500 ring-2 ring-teal-500/20"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Main Row summary */}
                <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Index, Name, Age/Sex, Department */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-5 gap-3 flex-1 items-center">
                    {/* Index & Name */}
                    <div className="sm:col-span-1 lg:col-span-2">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold shrink-0">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <label className="text-[10px] font-semibold text-slate-400 block uppercase">
                            Patient Name
                          </label>
                          <input
                            type="text"
                            value={patient.fullName}
                            onChange={(e) =>
                              updatePatient(patient.id, { fullName: e.target.value })
                            }
                            className="w-full text-xs font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-teal-500 focus:outline-none py-0.5 bg-transparent"
                            placeholder="Full Name"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Age & Sex */}
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block uppercase">
                        Age / Sex
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={patient.age}
                          onChange={(e) =>
                            updatePatient(patient.id, {
                              age: Number(e.target.value),
                            })
                          }
                          className="w-12 text-xs font-medium text-slate-800 border rounded px-1.5 py-0.5 border-slate-300 focus:ring-1 focus:ring-teal-500"
                        />
                        <select
                          value={patient.sex}
                          onChange={(e) =>
                            updatePatient(patient.id, { sex: e.target.value })
                          }
                          className="text-xs font-medium text-slate-800 border rounded px-1.5 py-0.5 border-slate-300 focus:ring-1 focus:ring-teal-500 bg-white"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    {/* Department */}
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block uppercase">
                        Department
                      </label>
                      <select
                        value={patient.departmentId}
                        onChange={(e) =>
                          updatePatient(patient.id, { departmentId: e.target.value })
                        }
                        className="w-full text-xs font-medium text-slate-800 border rounded px-2 py-0.5 border-slate-300 focus:ring-1 focus:ring-teal-500 bg-white"
                      >
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block uppercase">
                        Phone
                      </label>
                      <input
                        type="text"
                        value={patient.patientPhone}
                        onChange={(e) =>
                          updatePatient(patient.id, { patientPhone: e.target.value })
                        }
                        className="w-full text-xs font-medium text-slate-800 border rounded px-2 py-0.5 border-slate-300 focus:ring-1 focus:ring-teal-500"
                        placeholder="+91-..."
                      />
                    </div>
                  </div>

                  {/* Right: Quick Indicators & Expand Button */}
                  <div className="flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                        {patient.medications.length} Meds
                      </span>
                      {patient.allergies.length > 0 &&
                        patient.allergies[0] !== "No known drug allergies" && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                            Allergies
                          </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          updatePatient(patient.id, { expanded: !patient.expanded })
                        }
                        className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 px-2.5 py-1.5 rounded-lg hover:bg-teal-50 transition-colors"
                      >
                        <span>{patient.expanded ? "Collapse" : "Details"}</span>
                        {patient.expanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => deletePatient(patient.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Remove patient row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details Form */}
                {patient.expanded && (
                  <div className="px-5 pb-5 pt-3 border-t border-slate-100 bg-slate-50/50 space-y-4">
                    {/* Diagnosis */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Primary Discharge Diagnosis <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={patient.diagnosis}
                        onChange={(e) =>
                          updatePatient(patient.id, { diagnosis: e.target.value })
                        }
                        className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        placeholder="e.g. Acute Myocardial Infarction..."
                      />
                    </div>

                    {/* Caregiver Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1">
                          Caregiver / Relative Name
                        </label>
                        <input
                          type="text"
                          value={patient.caregiverName}
                          onChange={(e) =>
                            updatePatient(patient.id, {
                              caregiverName: e.target.value,
                            })
                          }
                          className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                          placeholder="Spouse / Child"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1">
                          Relationship
                        </label>
                        <input
                          type="text"
                          value={patient.caregiverRelation}
                          onChange={(e) =>
                            updatePatient(patient.id, {
                              caregiverRelation: e.target.value,
                            })
                          }
                          className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                          placeholder="e.g. Son, Daughter, Spouse"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1">
                          Caregiver Phone
                        </label>
                        <input
                          type="text"
                          value={patient.caregiverPhone}
                          onChange={(e) =>
                            updatePatient(patient.id, {
                              caregiverPhone: e.target.value,
                            })
                          }
                          className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                          placeholder="+91-..."
                        />
                      </div>
                    </div>

                    {/* Prescriptions & Follow up */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Medications */}
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-700">
                            Prescriptions ({patient.medications.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const newMeds = [
                                ...patient.medications,
                                { name: "", dose: "", frequency: "Once daily" },
                              ];
                              updatePatient(patient.id, { medications: newMeds });
                            }}
                            className="text-[11px] text-teal-600 font-semibold hover:underline"
                          >
                            + Add Medication
                          </button>
                        </div>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {patient.medications.map((m, mIdx) => (
                            <div
                              key={mIdx}
                              className="flex items-center gap-1.5 text-xs bg-slate-50 p-1.5 rounded border border-slate-200"
                            >
                              <input
                                type="text"
                                value={m.name}
                                onChange={(e) => {
                                  const updated = [...patient.medications];
                                  updated[mIdx].name = e.target.value;
                                  updatePatient(patient.id, { medications: updated });
                                }}
                                className="flex-1 bg-transparent border-none p-0 focus:ring-0 font-medium text-slate-800"
                                placeholder="Medication name"
                              />
                              <input
                                type="text"
                                value={m.dose}
                                onChange={(e) => {
                                  const updated = [...patient.medications];
                                  updated[mIdx].dose = e.target.value;
                                  updatePatient(patient.id, { medications: updated });
                                }}
                                className="w-16 bg-transparent border-none p-0 focus:ring-0 text-slate-500"
                                placeholder="Dose"
                              />
                              <input
                                type="text"
                                value={m.frequency}
                                onChange={(e) => {
                                  const updated = [...patient.medications];
                                  updated[mIdx].frequency = e.target.value;
                                  updatePatient(patient.id, { medications: updated });
                                }}
                                className="w-24 bg-transparent border-none p-0 focus:ring-0 text-slate-500"
                                placeholder="Frequency"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = patient.medications.filter(
                                    (_, i) => i !== mIdx
                                  );
                                  updatePatient(patient.id, { medications: updated });
                                }}
                                className="text-slate-400 hover:text-rose-500 p-0.5"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Follow-up Plan */}
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Follow-up Plan & Instructions
                        </label>
                        <textarea
                          rows={4}
                          value={patient.followUpPlan}
                          onChange={(e) =>
                            updatePatient(patient.id, {
                              followUpPlan: e.target.value,
                            })
                          }
                          className="w-full text-xs rounded border border-slate-300 p-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          placeholder="e.g. Suture removal in 7 days, daily BP checks..."
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Submission Alerts */}
          {submitError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-700 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {submitSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2 text-emerald-800 text-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{submitSuccess}</span>
            </div>
          )}

          {/* Action Footer Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-4 z-10">
            <div className="text-xs text-slate-600">
              Ready to enrol <span className="font-bold text-slate-900">{stagedPatients.length}</span>{" "}
              patient{stagedPatients.length > 1 ? "s" : ""} across departments.
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={clearStaged}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmBatch}
                disabled={isSubmitting || stagedPatients.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Enrolling {stagedPatients.length} Patients...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm & Enrol All ({stagedPatients.length} Patients)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

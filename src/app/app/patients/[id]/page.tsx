import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  User,
  HeartPulse,
  Pill,
  History,
  ShieldAlert,
  AlertTriangle,
  Calendar,
  Phone,
  Clock,
  CheckCircle2,
  Bell,
  Activity,
} from "lucide-react";
import type { Medication } from "@/lib/ai/extractHistory";

export default async function PatientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "overview" } = await searchParams;

  const supabase = await createClient();

  // Query patient and department
  const { data: patient } = await supabase
    .from("patients")
    .select(`
      *,
      departments (
        id,
        name
      )
    `)
    .eq("id", id)
    .single();

  if (!patient) {
    notFound();
  }

  // Query confirmed clinical record
  const { data: record } = await supabase
    .from("patient_records")
    .select("*")
    .eq("patient_id", id)
    .maybeSingle();

  const medications: Medication[] = Array.isArray(record?.medications)
    ? (record.medications as any)
    : [];
  const medicalHistory: string[] = Array.isArray(record?.medical_history)
    ? (record.medical_history as any)
    : [];
  const riskFactors: string[] = Array.isArray(record?.risk_factors)
    ? (record.risk_factors as any)
    : [];
  const allergies: string[] = Array.isArray(record?.allergies)
    ? (record.allergies as any)
    : [];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back Link */}
      <div>
        <Link
          href="/app/patients"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Patients list</span>
        </Link>
      </div>

      {/* Patient Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center shrink-0">
              <User className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {patient.full_name}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  Active Monitoring
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                <span>{patient.age} years old</span>
                <span>•</span>
                <span>{patient.sex}</span>
                <span>•</span>
                <span className="font-medium text-slate-700 flex items-center gap-1">
                  <Phone className="h-3 w-3 text-slate-400" />
                  {patient.patient_phone}
                </span>
                <span>•</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                  {patient.departments?.name || "General Unit"}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-slate-100 sm:pl-6 text-xs text-slate-500">
            <div>Discharged: <span className="font-semibold text-slate-800">{patient.discharge_date}</span></div>
            {patient.caregiver_name && (
              <div className="mt-1 text-[11px]">
                Caregiver: <span className="font-medium text-slate-700">{patient.caregiver_name} ({patient.caregiver_relation})</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-6 text-sm font-semibold">
        <Link
          href={`/app/patients/${id}?tab=overview`}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            tab === "overview"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>Overview</span>
        </Link>
        <Link
          href={`/app/patients/${id}?tab=timeline`}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            tab === "timeline"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Timeline (Phase 3)</span>
        </Link>
        <Link
          href={`/app/patients/${id}?tab=alerts`}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            tab === "alerts"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Bell className="h-4 w-4" />
          <span>Alerts (Phase 4)</span>
        </Link>
      </div>

      {/* TAB CONTENT */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Confirmed Record Banner */}
          {record && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-800">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Clinical record confirmed by hospital physician</span>
              </div>
              <span className="text-[11px] text-emerald-600">
                {new Date(record.confirmed_at).toLocaleString()}
              </span>
            </div>
          )}

          {/* Diagnosis Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              Primary Diagnosis
            </span>
            <div className="text-lg font-bold text-slate-900">
              {record?.diagnosis || "No structured record confirmed yet."}
            </div>
          </div>

          {/* Discharge Medications */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  Discharge Medications ({medications.length})
                </h3>
              </div>
            </div>

            {medications.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No discharge medications recorded.</p>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Medication</th>
                      <th className="py-2.5 px-3">Dose</th>
                      <th className="py-2.5 px-3">Frequency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {medications.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-800">{m.name}</td>
                        <td className="p-3 text-slate-600">{m.dose}</td>
                        <td className="p-3 text-slate-600">{m.frequency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* History & Risk Factors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-800">Past Medical History</h3>
              </div>
              {medicalHistory.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No past history recorded.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {medicalHistory.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-800">Risk Factors</h3>
              </div>
              {riskFactors.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No specific risk factors noted.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {riskFactors.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Allergies & Follow-up Plan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                <h3 className="text-sm font-bold text-slate-800">Documented Allergies</h3>
              </div>
              {allergies.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No known drug allergies (NKDA).</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {allergies.map((allergy, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200"
                    >
                      {allergy}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-800">Follow-Up Plan</h3>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {record?.follow_up_plan || "No follow-up plan documented."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TIMELINE TAB (PHASE 3) */}
      {tab === "timeline" && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
          <Clock className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">
            Recovery Timeline Begins in Phase 3
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            In Phase 3, this timeline will log scheduled one-tap check-in questions, patient response submissions, and AI health assessments over the post-discharge recovery window.
          </p>
        </div>
      )}

      {/* ALERTS TAB (PHASE 4) */}
      {tab === "alerts" && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
          <Bell className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">
            Priority Alert History (Phase 4)
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            Red-flag symptom escalations, missed check-in notifications, and caregiver alerts will appear here in Phase 4.
          </p>
        </div>
      )}
    </div>
  );
}

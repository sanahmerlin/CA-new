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
  Sparkles,
  QrCode,
} from "lucide-react";
import type { Medication } from "@/lib/ai/extractHistory";
import { PatientQrButton } from "./patient-qr-button";

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

  // Query monitoring plan
  const { data: monitoringPlan } = await supabase
    .from("monitoring_plans")
    .select("*")
    .eq("patient_id", id)
    .maybeSingle();

  // Query checkins and responses
  const { data: checkins } = await supabase
    .from("checkins")
    .select(`
      id,
      scheduled_day,
      scheduled_for,
      status,
      questions,
      created_at
    `)
    .eq("patient_id", id)
    .order("scheduled_day", { ascending: true });

  // Query alerts
  const { data: alerts } = await supabase
    .from("alerts")
    .select("*")
    .eq("patient_id", id)
    .order("created_at", { ascending: false });

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
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {patient.full_name}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  Active Monitoring
                </span>

                {patient.plan_tier === "pro" && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    <Sparkles className="h-3 w-3 text-amber-600" />
                    <span>CareAfter Pro VIP</span>
                  </span>
                )}
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

          <div className="flex flex-col sm:items-end gap-2 text-xs text-slate-500">
            <div>
              Discharged: <span className="font-semibold text-slate-800">{patient.discharge_date}</span>
            </div>
            {patient.access_code && (
              <PatientQrButton
                accessCode={patient.access_code}
                patientName={patient.full_name}
              />
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
          <span>Monitoring Timeline ({checkins?.length || 0})</span>
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
          <span>Priority Alerts ({alerts?.length || 0})</span>
        </Link>
      </div>

      {/* TAB 1: OVERVIEW */}
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

          {/* Monitoring Plan Summary (Phase 3) */}
          {monitoringPlan && (
            <div className="bg-white rounded-xl border border-teal-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                  Phase 3 AI Monitoring Protocol
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  {monitoringPlan.risk_tier} Risk • {monitoringPlan.window_days} Days Window
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Focus Areas:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(Array.isArray(monitoringPlan.focus_areas) ? (monitoringPlan.focus_areas as string[]) : []).map((fa: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                        {fa}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Red Flag Watch Symptoms:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(Array.isArray(monitoringPlan.red_flag_symptoms) ? (monitoringPlan.red_flag_symptoms as string[]) : []).map((rf: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[11px] border border-rose-100">
                        {rf}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
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
        </div>
      )}

      {/* TAB 2: TIMELINE (PHASE 3 ACTIVE ENGINE) */}
      {tab === "timeline" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Recovery Check-in Schedule
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pre-generated daily check-in cycles (English, Malayalam, Hindi)
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              {checkins?.length || 0} Total Cycles
            </span>
          </div>

          <div className="space-y-3">
            {checkins?.map((cycle: any) => (
              <div
                key={cycle.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold">
                      {cycle.scheduled_day}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      Day {cycle.scheduled_day} Check-in
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      cycle.status === "answered"
                        ? "bg-emerald-100 text-emerald-800"
                        : cycle.status === "active"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {cycle.status}
                  </span>
                </div>

                {/* Questions Preview */}
                <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 border border-slate-100 text-xs">
                  {cycle.questions?.map((q: any, qIdx: number) => (
                    <div key={q.id || qIdx} className="flex items-start gap-1.5 text-slate-700">
                      <span className="text-slate-400 font-medium">{qIdx + 1}.</span>
                      <div>
                        <p className="font-medium text-slate-900">{q.text?.en || q.text}</p>
                        {q.text?.ml && (
                          <p className="text-[11px] text-slate-500">{q.text.ml}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ALERTS TAB */}
      {tab === "alerts" && (
        <div className="space-y-3">
          {(!alerts || alerts.length === 0) ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">
                No Active Alerts for this Patient
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Patient responses have not triggered any critical or urgent red flags.
              </p>
            </div>
          ) : (
            alerts.map((alert: any) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border ${
                  alert.severity === "critical"
                    ? "bg-rose-50 border-rose-200"
                    : alert.severity === "urgent"
                    ? "bg-amber-50 border-amber-200"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        alert.severity === "critical"
                          ? "bg-rose-600 text-white"
                          : alert.severity === "urgent"
                          ? "bg-amber-600 text-white"
                          : "bg-sky-600 text-white"
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      Alert ({alert.source})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {new Date(alert.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="mt-2 space-y-1">
                  {alert.reasons?.map((reason: string, idx: number) => (
                    <p key={idx} className="text-xs font-semibold text-rose-900">
                      • {reason}
                    </p>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

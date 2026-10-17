import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
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
  HelpCircle,
  AlertCircle,
  FileText,
} from "lucide-react";
import type { Medication } from "@/lib/ai/extractHistory";
import { PatientCredentialsHeader } from "./patient-credentials-header";
import { PatientAlertActions } from "./patient-alert-actions";
import { PatientAnalysisClient } from "./patient-analysis-client";

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

  // 1. Query patient and department
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

  // 2. Query confirmed clinical record
  const { data: record } = await supabase
    .from("patient_records")
    .select("*")
    .eq("patient_id", id)
    .maybeSingle();

  // 3. Query monitoring plan
  const { data: monitoringPlan } = await supabase
    .from("monitoring_plans")
    .select("*")
    .eq("patient_id", id)
    .maybeSingle();

  // 4. Query checkins
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

  const serviceClient = createServiceClient();

  // 5. Query alerts
  const { data: alerts } = await serviceClient
    .from("alerts")
    .select("*")
    .eq("patient_id", id)
    .order("created_at", { ascending: false });

  // 6. Query patient responses & clinical triage analysis
  const { data: responses } = await serviceClient
    .from("responses")
    .select("*")
    .eq("patient_id", id)
    .order("answered_at", { ascending: false });

  const medications: Medication[] = Array.isArray(record?.medications)
    ? (record.medications as any)
    : [];
  const medicalHistory: string[] = Array.isArray(record?.medical_history)
    ? (record.medical_history as any)
    : [];
  const riskFactors: string[] = Array.isArray(record?.risk_factors)
    ? (record.risk_factors as any)
    : [];

  const openAlerts = (alerts || []).filter(
    (a: any) => a.status === "open" || a.status === "acknowledged"
  );
  const criticalAlert = openAlerts.find((a: any) => a.severity === "critical");
  const urgentAlert = openAlerts.find((a: any) => a.severity === "urgent");
  const highestActiveAlert = criticalAlert || urgentAlert || openAlerts[0] || null;

  const latestResponse = responses && responses.length > 0 ? responses[0] : null;

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

      {/* EMERGENCY ALERT BANNER (Shows when patient has an active open alert) */}
      {highestActiveAlert && (
        <div
          className={`rounded-2xl border p-5 shadow-sm transition-all ${
            highestActiveAlert.severity === "critical"
              ? "bg-rose-50 border-rose-300 text-rose-950"
              : highestActiveAlert.severity === "urgent"
              ? "bg-amber-50 border-amber-300 text-amber-950"
              : "bg-sky-50 border-sky-300 text-sky-950"
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 flex-1 min-w-0">
              <div
                className={`p-3 rounded-xl text-white shrink-0 mt-0.5 ${
                  highestActiveAlert.severity === "critical"
                    ? "bg-rose-600 animate-pulse shadow-xs"
                    : "bg-amber-600 shadow-xs"
                }`}
              >
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      highestActiveAlert.severity === "critical"
                        ? "bg-rose-600 text-white"
                        : "bg-amber-600 text-white"
                    }`}
                  >
                    {highestActiveAlert.severity} safety alert active
                  </span>
                  <span className="text-xs text-slate-500">
                    Reported {new Date(highestActiveAlert.created_at).toLocaleString()}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    • Status: <strong className="capitalize text-slate-800">{highestActiveAlert.status}</strong>
                  </span>
                </div>

                <h2 className="text-base font-bold text-slate-900 mt-1">
                  Immediate Clinical Action Required
                </h2>

                <div className="mt-2 space-y-1">
                  {(Array.isArray(highestActiveAlert.reasons) ? (highestActiveAlert.reasons as string[]) : []).map((reason: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-1.5 text-xs font-bold text-rose-900">
                      <span className="text-rose-500">•</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>

                {latestResponse?.clinical_summary && (
                  <div className="mt-3 p-3 rounded-xl bg-white/90 border border-rose-200/80 text-xs text-slate-800 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-rose-800 mb-1">
                      <Sparkles className="h-3.5 w-3.5 text-rose-600" />
                      <span>Gemini Triage Analysis for Doctors:</span>
                    </div>
                    <p className="leading-relaxed">{latestResponse.clinical_summary}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:items-end gap-2.5 shrink-0">
              <a
                href={`tel:${patient.patient_phone}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Call Patient ({patient.patient_phone})</span>
              </a>

              <PatientAlertActions
                alertId={highestActiveAlert.id}
                currentStatus={highestActiveAlert.status}
              />
            </div>
          </div>
        </div>
      )}

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

                {/* Dynamic Status Badge */}
                {highestActiveAlert ? (
                  highestActiveAlert.severity === "critical" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                      <span className="h-2 w-2 rounded-full bg-rose-600"></span>
                      Critical Alert Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      <span className="h-2 w-2 rounded-full bg-amber-600"></span>
                      Urgent Alert Active
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    Active Monitoring
                  </span>
                )}

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
            <PatientCredentialsHeader
              patientId={patient.id}
              username={patient.username}
              fullName={patient.full_name}
              age={patient.age}
            />
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
          {responses && responses.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              {responses.length} answered
            </span>
          )}
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
          <span>Priority Alerts</span>
          {alerts && alerts.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                openAlerts.length > 0
                  ? "bg-rose-600 text-white animate-pulse"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {alerts.length}
            </span>
          )}
        </Link>
      </div>

      {/* TAB 1: OVERVIEW */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* ANALYSIS ONLY STREAM (NEWEST FIRST WITH STATUS CHIP & TIMESTAMPS) */}
          <PatientAnalysisClient patientId={id} initialResponses={(responses || []) as any} />

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

      {/* TAB 2: TIMELINE (CHECKINS & RESPONSES) */}
      {tab === "timeline" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Recovery Check-in Schedule & Patient Responses
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Multilingual questionnaires with verified patient submissions and AI triage summaries
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              {checkins?.length || 0} Total Cycles
            </span>
          </div>

          <div className="space-y-4">
            {checkins?.map((cycle: any) => {
              // Find matching response for this cycle
              const cycleResponse = (responses || []).find((r: any) => r.checkin_id === cycle.id);
              const isAnswered = cycle.status === "answered" || Boolean(cycleResponse);
              const answersMap = (cycleResponse?.answers as Record<string, string>) || {};

              return (
                <div
                  key={cycle.id}
                  className={`bg-white rounded-2xl border p-5 shadow-xs space-y-4 ${
                    cycleResponse?.severity === "critical"
                      ? "border-rose-300"
                      : cycleResponse?.severity === "urgent"
                      ? "border-amber-300"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-teal-600 text-white text-xs font-bold shadow-2xs">
                        {cycle.scheduled_day}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          Day {cycle.scheduled_day} Recovery Check-in
                        </span>
                        {cycleResponse?.answered_at && (
                          <span className="text-[11px] text-slate-400">
                            Answered on {new Date(cycleResponse.answered_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {cycleResponse?.severity && (
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            cycleResponse.severity === "critical"
                              ? "bg-rose-600 text-white animate-pulse"
                              : cycleResponse.severity === "urgent"
                              ? "bg-amber-600 text-white"
                              : cycleResponse.severity === "watch"
                              ? "bg-sky-600 text-white"
                              : "bg-emerald-600 text-white"
                          }`}
                        >
                          {cycleResponse.severity}
                        </span>
                      )}

                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          isAnswered
                            ? "bg-emerald-100 text-emerald-800"
                            : cycle.status === "active"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {isAnswered ? "Answered" : cycle.status}
                      </span>
                    </div>
                  </div>

                  {/* If Answered: Show AI Clinical Summary */}
                  {cycleResponse?.clinical_summary && (
                    <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200/90 text-xs text-slate-800 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-teal-800">
                        <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                        <span>AI Clinical Triage Assessment:</span>
                      </div>
                      <p className="leading-relaxed">{cycleResponse.clinical_summary}</p>
                    </div>
                  )}

                  {/* Analysis-only display: No raw answers shown on admin side */}
                  {isAnswered && Array.isArray(cycleResponse?.red_flags_detected) && cycleResponse.red_flags_detected.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Alerted symptoms:
                      </span>
                      {(cycleResponse.red_flags_detected as any[]).map((flag: any, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-semibold"
                        >
                          {String(flag)}
                        </span>
                      ))}
                    </div>
                  )}

                  {!isAnswered && (
                    <p className="text-xs text-slate-400 italic">
                      Scheduled recovery check-in for Day {cycle.scheduled_day}. Awaiting patient response.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ALERTS TAB */}
      {tab === "alerts" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Clinical Alerts Log</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated triage escalations triggered by patient symptoms and rule violations
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {alerts?.length || 0} Total Alerts
            </span>
          </div>

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
            alerts.map((alert: any) => {
              const isCrit = alert.severity === "critical";
              const isUrg = alert.severity === "urgent";

              return (
                <div
                  key={alert.id}
                  className={`p-5 rounded-2xl border shadow-xs space-y-3.5 transition-colors ${
                    isCrit
                      ? "bg-rose-50/50 border-rose-200"
                      : isUrg
                      ? "bg-amber-50/40 border-amber-200"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          isCrit
                            ? "bg-rose-600 text-white"
                            : isUrg
                            ? "bg-amber-600 text-white"
                            : "bg-sky-600 text-white"
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        Triggered by {alert.source?.toUpperCase() || "RULE ENGINE"}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        • {new Date(alert.created_at).toLocaleString()}
                      </span>
                    </div>

                    {/* Alert Action Buttons (Acknowledge / Resolve) */}
                    <PatientAlertActions alertId={alert.id} currentStatus={alert.status} />
                  </div>

                  <div className="space-y-1.5 bg-white/80 p-3 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Reported Concerns:
                    </span>
                    {(Array.isArray(alert.reasons) ? (alert.reasons as string[]) : []).map((reason: string, idx: number) => (
                      <p key={idx} className="text-xs font-semibold text-rose-900 flex items-start gap-1.5">
                        <span className="text-rose-500">•</span>
                        <span>{reason}</span>
                      </p>
                    ))}
                  </div>

                  {alert.resolved_at && (
                    <div className="text-[11px] text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                      <strong>Resolved:</strong> {alert.resolved_note || "Resolved by clinical staff"} on{" "}
                      {new Date(alert.resolved_at).toLocaleString()}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  HeartPulse,
  Building2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  FastForward,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  User,
  Sparkles,
  Phone,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { acknowledgeAlert, resolveAlert, advanceSimulatedTime, resetSimulatedTime } from "./actions";

interface AlertItem {
  id: string;
  severity: "watch" | "urgent" | "critical";
  reasons: string[];
  source: string;
  status: "open" | "acknowledged" | "resolved";
  created_at: string;
  patient_id: string;
  patient?: {
    id: string;
    full_name: string;
    age: number;
    sex: string;
    plan_tier?: string;
    patient_phone?: string;
    departments?: { name: string } | null;
  } | null;
  responses?: {
    clinical_summary?: string;
    answered_at?: string;
  } | null;
}

interface Props {
  initialAlerts: AlertItem[];
  patientCount: number;
  activeCheckinCount: number;
  departmentCount: number;
  initialSimulatedDateString: string;
}

export function DashboardClient({
  initialAlerts,
  patientCount,
  activeCheckinCount,
  departmentCount,
  initialSimulatedDateString,
}: Props) {
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts);
  const [expandedAlerts, setExpandedAlerts] = useState<Record<string, boolean>>({});
  const [simDate, setSimDate] = useState(initialSimulatedDateString);
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Supabase Realtime subscription for live incoming alerts
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard_alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        (payload) => {
          // Add new alert to top of feed
          const newAlert = payload.new as any;
          setAlerts((prev) => [newAlert, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "alerts" },
        (payload) => {
          const updated = payload.new as any;
          setAlerts((prev) =>
            prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedAlerts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAcknowledge = async (id: string) => {
    await acknowledgeAlert(id);
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "acknowledged" } : a))
    );
  };

  const handleResolve = async (id: string) => {
    await resolveAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleFastForward = async (minutes: number) => {
    setIsAdvancing(true);
    await advanceSimulatedTime(minutes);
    setIsAdvancing(false);
    window.location.reload();
  };

  const handleResetTime = async () => {
    setIsAdvancing(true);
    await resetSimulatedTime();
    setIsAdvancing(false);
    window.location.reload();
  };

  const openAlerts = alerts.filter((a) => a.status !== "resolved");

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Time Control Demo Banner (Phase 3 Engine) */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-teal-700/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-500/20 text-teal-300 rounded-xl border border-teal-500/30">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30">
                Simulated Time Travel Engine
              </span>
            </div>
            <p className="text-base font-extrabold text-white mt-1">
              {simDate}
            </p>
          </div>
        </div>

        {/* Fast-Forward Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            disabled={isAdvancing}
            onClick={() => handleFastForward(180)} // +3 hours
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors"
          >
            <FastForward className="h-3.5 w-3.5 text-teal-300" />
            <span>+3h</span>
          </button>

          <button
            type="button"
            disabled={isAdvancing}
            onClick={() => handleFastForward(1440)} // +1 day
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors"
          >
            <FastForward className="h-3.5 w-3.5 text-teal-300" />
            <span>+1 Day</span>
          </button>

          <button
            type="button"
            disabled={isAdvancing}
            onClick={() => handleFastForward(10080)} // +1 week
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors"
          >
            <FastForward className="h-3.5 w-3.5 text-teal-300" />
            <span>+1 Week</span>
          </button>

          <button
            type="button"
            disabled={isAdvancing}
            onClick={handleResetTime}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Time</span>
          </button>
        </div>
      </div>

      {/* 4 Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Patients */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Enrolled Patients
            </span>
            <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">{patientCount}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Post-discharge care</span>
          </div>
        </div>

        {/* Active Cycles */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Active Check-ins
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <HeartPulse className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">{activeCheckinCount}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Scheduled daily cycles</span>
          </div>
        </div>

        {/* Open Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Priority Alerts
            </span>
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                openAlerts.length > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
              }`}
            >
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span
              className={`text-2xl font-bold ${
                openAlerts.length > 0 ? "text-rose-600" : "text-slate-900"
              }`}
            >
              {openAlerts.length}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Requires clinical review
            </span>
          </div>
        </div>

        {/* Departments */}
        <Link
          href="/app/departments"
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-teal-300 transition-colors group block"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Departments
            </span>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{departmentCount}</span>
            <span className="text-[11px] font-medium text-teal-600 group-hover:underline">
              View &rarr;
            </span>
          </div>
        </Link>
      </div>

      {/* Priority Alerts Live Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                openAlerts.length > 0 ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
              }`}
            ></div>
            <h2 className="text-sm font-bold text-slate-900">
              Priority Clinical Alerts ({openAlerts.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Realtime Triage & Red Flag Stream
          </span>
        </div>

        {openAlerts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 mb-3">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">
              No Open Clinical Alerts
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              All post-discharge patients are stable. When a patient reports severe symptoms or red flags on their mobile portal, prioritized cards will appear here instantly.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {openAlerts.map((alert) => {
              const isExpanded = Boolean(expandedAlerts[alert.id]);
              const isCritical = alert.severity === "critical";
              const isUrgent = alert.severity === "urgent";

              return (
                <div
                  key={alert.id}
                  className={`p-5 transition-colors ${
                    isCritical
                      ? "bg-rose-50/30 hover:bg-rose-50/50"
                      : isUrgent
                      ? "bg-amber-50/20 hover:bg-amber-50/40"
                      : "hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Patient Info & Severity */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                          isCritical
                            ? "bg-rose-100 text-rose-600"
                            : isUrgent
                            ? "bg-amber-100 text-amber-700"
                            : "bg-teal-100 text-teal-700"
                        }`}
                      >
                        {isCritical ? (
                          <ShieldAlert className="h-5 w-5" />
                        ) : (
                          <AlertTriangle className="h-5 w-5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/app/patients/${alert.patient_id}`}
                            className="text-sm font-bold text-slate-900 hover:text-teal-600"
                          >
                            {alert.patient?.full_name || "Enrolled Patient"}
                          </Link>

                          {alert.patient && (
                            <span className="text-xs text-slate-500">
                              ({alert.patient.age}
                              {alert.patient.sex ? alert.patient.sex[0] : ""})
                            </span>
                          )}

                          {/* Severity Chip */}
                          <span
                            className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                              isCritical
                                ? "bg-rose-600 text-white"
                                : isUrgent
                                ? "bg-amber-600 text-white"
                                : "bg-sky-600 text-white"
                            }`}
                          >
                            {alert.severity}
                          </span>

                          {/* Source */}
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            Source: {alert.source}
                          </span>

                          {/* Pro VIP badge */}
                          {alert.patient?.plan_tier === "pro" && (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              <Sparkles className="h-3 w-3" />
                              <span>Pro VIP</span>
                            </span>
                          )}
                        </div>

                        {/* Reasons */}
                        <div className="mt-1.5 space-y-0.5">
                          {alert.reasons?.map((reason, rIdx) => (
                            <p
                              key={rIdx}
                              className="text-xs font-semibold text-slate-900 line-clamp-1"
                            >
                              • {reason}
                            </p>
                          ))}
                        </div>

                        {/* Timestamp */}
                        <p className="text-[10px] text-slate-400 mt-1">
                          Reported at {new Date(alert.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <button
                        type="button"
                        onClick={() => toggleExpand(alert.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <span>Why flagged?</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>

                      {alert.status === "open" && (
                        <button
                          type="button"
                          onClick={() => handleAcknowledge(alert.id)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleResolve(alert.id)}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Resolve</span>
                      </button>
                    </div>
                  </div>

                  {/* Expanded: Clinical assessment paragraph & Layer analysis */}
                  {isExpanded && (
                    <div className="mt-4 pt-3.5 border-t border-slate-200/80 bg-white p-4 rounded-xl border space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          Clinical AI Assessment Paragraph
                        </span>
                        <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                          Gemini 3.5 Flash Safety Analysis
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed">
                        {alert.responses?.clinical_summary ||
                          "Patient reported concerning symptom indicators. Immediate attending nurse outreach recommended to evaluate wound healing and hemodynamic stability."}
                      </p>

                      <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100">
                        <span>Patient Contact: {alert.patient?.patient_phone || "Not recorded"}</span>
                        <Link
                          href={`/app/patients/${alert.patient_id}`}
                          className="font-semibold text-teal-600 hover:underline flex items-center gap-1"
                        >
                          <span>Open Full Patient Chart</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

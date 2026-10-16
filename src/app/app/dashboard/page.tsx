import { createClient } from "@/lib/supabase/server";
import { Users, HeartPulse, Building2, AlertTriangle, ShieldCheck } from "lucide-react";
import { t } from "@/lib/i18n";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Query departments count for the signed-in tenant hospital
  const { count: departmentCount } = await supabase
    .from("departments")
    .select("*", { count: "exact", head: true });

  // Query enrolled patients count for the signed-in tenant hospital
  const { count: patientCount } = await supabase
    .from("patients")
    .select("*", { count: "exact", head: true });

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {t("dashboard.title")}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {t("dashboard.subtitle")}
        </p>
      </div>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t("dashboard.totalPatients")}
            </span>
            <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-900">{patientCount ?? 0}</span>
            <span className="text-xs text-slate-400 ml-2">Enrolled post-discharge</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t("dashboard.activeMonitoring")}
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <HeartPulse className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-900">0</span>
            <span className="text-xs text-slate-400 ml-2">Active check-in cycles</span>
          </div>
        </div>

        <Link
          href="/app/departments"
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-teal-300 transition-colors group block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t("dashboard.departmentsCount")}
            </span>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">
              {departmentCount ?? 0}
            </span>
            <span className="text-xs font-medium text-teal-600 group-hover:underline">
              Manage Departments &rarr;
            </span>
          </div>
        </Link>
      </div>

      {/* Priority Alerts Panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <h2 className="text-sm font-bold text-slate-800">
              {t("dashboard.priorityAlertsTitle")}
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            AI Triage & Urgency Evaluation
          </span>
        </div>

        <div className="p-12 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 mb-3">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">
            {t("dashboard.noAlerts")}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            When enrolled patients submit answers indicating red-flag symptoms or critical pain markers, prioritized alert cards will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}

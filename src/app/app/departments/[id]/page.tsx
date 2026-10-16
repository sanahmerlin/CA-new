import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Building2, ChevronLeft, Users, BarChart3, AlertCircle } from "lucide-react";
import { t } from "@/lib/i18n";

export default async function DepartmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "patients" } = await searchParams;

  const supabase = await createClient();

  const { data: department } = await supabase
    .from("departments")
    .select("id, name, created_at, hospital_id")
    .eq("id", id)
    .single();

  if (!department) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Back Link */}
      <div>
        <Link
          href="/app/departments"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to all departments</span>
        </Link>
      </div>

      {/* Department Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center shrink-0">
          <Building2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {department.name}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Department ID: <span className="font-mono text-slate-600">{department.id}</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-6 text-sm font-semibold">
        <Link
          href={`/app/departments/${id}?tab=patients`}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            tab === "patients"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>{t("departments.patientsTab")}</span>
        </Link>
        <Link
          href={`/app/departments/${id}?tab=analytics`}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            tab === "analytics"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>{t("departments.analyticsTab")}</span>
        </Link>
      </div>

      {/* Tab Content */}
      {tab === "patients" ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 text-slate-400 mb-3">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">
            {t("departments.patientsEmpty")}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Patients enrolled in this department will appear here in Phase 2 with condition summaries and risk tiers.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 text-slate-400 mb-3">
            <BarChart3 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">
            {t("departments.analyticsEmpty")}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Recovery progression metrics and response rates will appear once patients submit their daily check-ins.
          </p>
        </div>
      )}
    </div>
  );
}

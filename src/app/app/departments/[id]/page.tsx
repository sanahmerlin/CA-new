import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Building2, ChevronLeft, Users, BarChart3, ChevronRight, UserPlus } from "lucide-react";
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

  // Fetch patients enrolled in this specific department
  const { data: deptPatients } = await supabase
    .from("patients")
    .select(`
      id,
      full_name,
      age,
      sex,
      patient_phone,
      discharge_date,
      status,
      patient_records (
        diagnosis
      )
    `)
    .eq("department_id", id)
    .order("created_at", { ascending: false });

  const patientList = (deptPatients || []).map((p: any) => ({
    ...p,
    record: Array.isArray(p.patient_records) ? p.patient_records[0] : p.patient_records,
  }));

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
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center shrink-0">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {department.name}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {patientList.length} {patientList.length === 1 ? "patient" : "patients"} actively monitored in this unit
            </p>
          </div>
        </div>

        <Link
          href="/app/patients/enrol"
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors shrink-0"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>Enrol Patient</span>
        </Link>
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
          <span>{t("departments.patientsTab")} ({patientList.length})</span>
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
        patientList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 text-slate-400 mb-3">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              {t("departments.patientsEmpty")}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
              Enrol discharged patients into {department.name} to start condition-specific monitoring.
            </p>
            <Link
              href="/app/patients/enrol"
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              <span>Enrol Patient</span>
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Diagnosis</th>
                  <th className="py-3 px-4">Discharged</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patientList.map((patient: any) => (
                  <tr key={patient.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/app/patients/${patient.id}`}
                        className="font-bold text-slate-900 hover:text-teal-700 transition-colors block"
                      >
                        {patient.full_name}
                      </Link>
                      <div className="text-[11px] text-slate-400">
                        {patient.age}y • {patient.sex} • {patient.patient_phone}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-800" title={patient.record?.diagnosis || ""}>
                      {patient.record?.diagnosis || "Pending"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {patient.discharge_date}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        Active
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/app/patients/${patient.id}`}
                        className="p-1.5 rounded-md text-slate-400 hover:text-teal-700 hover:bg-teal-50 inline-flex items-center"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
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

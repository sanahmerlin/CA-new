"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, UserPlus, Users, Building2, ChevronRight, ShieldAlert, AlertTriangle, Layers } from "lucide-react";

interface PatientItem {
  id: string;
  full_name: string;
  age: number;
  sex: string;
  patient_phone: string;
  discharge_date: string;
  status: string;
  department_id: string | null;
  department?: {
    id: string;
    name: string;
  } | null;
  record?: {
    diagnosis: string;
  } | null;
  highestAlertSeverity?: "critical" | "urgent" | "watch" | null;
  activeAlerts?: Array<{
    id: string;
    severity: string;
    status: string;
    reasons: string[];
  }>;
}

interface Department {
  id: string;
  name: string;
}

export function PatientsClient({
  patients,
  departments,
}: {
  patients: PatientItem[];
  departments: Department[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [alertFilter, setAlertFilter] = useState<"all" | "action_required" | "stable">("all");

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 4000);
    return () => clearInterval(interval);
  }, [router]);

  const actionRequiredCount = patients.filter(
    (p) => p.highestAlertSeverity === "critical" || p.highestAlertSeverity === "urgent"
  ).length;

  const stableCount = patients.filter((p) => !p.highestAlertSeverity).length;

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.record?.diagnosis?.toLowerCase().includes(search.toLowerCase()) ||
      p.patient_phone.includes(search);

    const matchesDept = selectedDept === "all" || p.department_id === selectedDept;

    let matchesAlert = true;
    if (alertFilter === "action_required") {
      matchesAlert = p.highestAlertSeverity === "critical" || p.highestAlertSeverity === "urgent";
    } else if (alertFilter === "stable") {
      matchesAlert = !p.highestAlertSeverity;
    }

    return matchesSearch && matchesDept && matchesAlert;
  });

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header with Enrol CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Patients</h1>
            {actionRequiredCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white shadow-xs animate-pulse">
                <ShieldAlert className="h-3.5 w-3.5" />
                {actionRequiredCount} Action Required
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Enrolled post-discharge patients and clinical monitoring status
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            href="/app/patients/enrol?mode=bulk"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg border border-slate-300 shadow-xs transition-colors"
          >
            <Layers className="h-4 w-4 text-teal-600" />
            <span>Bulk Upload</span>
          </Link>

          <Link
            href="/app/patients/enrol"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            <span>Enrol Patient</span>
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by patient name, diagnosis, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-medium"
            >
              <option value="all">All Departments ({patients.length})</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Triage Status Filters */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Status:
          </span>
          <button
            type="button"
            onClick={() => setAlertFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              alertFilter === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Patients ({patients.length})
          </button>

          {actionRequiredCount > 0 && (
            <button
              type="button"
              onClick={() => setAlertFilter("action_required")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                alertFilter === "action_required"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Immediate Attention ({actionRequiredCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setAlertFilter("stable")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              alertFilter === "stable"
                ? "bg-emerald-700 text-white"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
            }`}
          >
            Stable ({stableCount})
          </button>
        </div>
      </div>

      {/* Patient List Table / Cards */}
      {filteredPatients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 text-slate-400 mb-3">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">No patients found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
            {search || selectedDept !== "all" || alertFilter !== "all"
              ? "No patients match your search criteria. Try resetting the filters."
              : "No patients enrolled in this hospital yet. Enrol a discharged patient to start monitoring."}
          </p>
          <Link
            href="/app/patients/enrol"
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            <span>Enrol First Patient</span>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Diagnosis</th>
                <th className="py-3 px-4">Discharged</th>
                <th className="py-3 px-4">Clinical Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.map((patient) => {
                const isCritical = patient.highestAlertSeverity === "critical";
                const isUrgent = patient.highestAlertSeverity === "urgent";
                const isWatch = patient.highestAlertSeverity === "watch";

                return (
                  <tr
                    key={patient.id}
                    className={`transition-colors group cursor-pointer ${
                      isCritical
                        ? "bg-rose-50/50 hover:bg-rose-100/60 border-l-4 border-l-rose-600"
                        : isUrgent
                        ? "bg-amber-50/40 hover:bg-amber-100/50 border-l-4 border-l-amber-500"
                        : "hover:bg-slate-50/60"
                    }`}
                    onClick={() => (window.location.href = `/app/patients/${patient.id}`)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                          {patient.full_name}
                        </span>
                        {isCritical && (
                          <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-rose-600 text-white tracking-wider animate-pulse">
                            CRITICAL
                          </span>
                        )}
                        {isUrgent && (
                          <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-amber-600 text-white tracking-wider">
                            URGENT
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {patient.age}y • {patient.sex} • {patient.patient_phone}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {patient.department?.name || "General"}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-800" title={patient.record?.diagnosis || ""}>
                      {patient.record?.diagnosis || "Diagnosis pending"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {patient.discharge_date}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {isCritical ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 shadow-xs animate-pulse">
                          <span className="h-2 w-2 rounded-full bg-rose-600"></span>
                          Critical Alert Active
                        </span>
                      ) : isUrgent ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
                          <span className="h-2 w-2 rounded-full bg-amber-600"></span>
                          Urgent Alert Active
                        </span>
                      ) : isWatch ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-500"></span>
                          Watchlist
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          Active Monitoring
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/app/patients/${patient.id}`}
                        className="p-1.5 rounded-md text-slate-400 hover:text-teal-700 hover:bg-teal-50 inline-flex items-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

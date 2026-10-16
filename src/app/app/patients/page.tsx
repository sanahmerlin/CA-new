import { Users, UserPlus } from "lucide-react";
import { t } from "@/lib/i18n";

export default function PatientsPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t("nav.patients")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enrolled discharge patients and recovery plans
          </p>
        </div>
        <button
          disabled
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-200 text-slate-400 text-sm font-semibold rounded-lg cursor-not-allowed self-start sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          Enrol Discharged Patient (Phase 2)
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 text-slate-400 mb-3">
          <Users className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">
          Patient Enrollment Begins in Phase 2
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
          Hospital staff will be able to input discharge notes, generate Gemini AI condition summaries, and configure frequency-tapered check-in schedules.
        </p>
      </div>
    </div>
  );
}

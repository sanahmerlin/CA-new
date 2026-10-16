import { createClient } from "@/lib/supabase/server";
import { Settings, Clock, FastForward, Hospital, Shield } from "lucide-react";
import { t } from "@/lib/i18n";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name, hospital_id")
        .eq("id", user.id)
        .single()
    : { data: null };

  const { data: hospital } = profile?.hospital_id
    ? await supabase
        .from("hospitals")
        .select("id, name, contact_phone")
        .eq("id", profile.hospital_id)
        .single()
    : { data: null };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {t("nav.settings")}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Hospital configuration and demo simulated time control
        </p>
      </div>

      {/* Hospital Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
            <Hospital className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Hospital Organization</h2>
            <p className="text-xs text-slate-400">Multi-tenant boundary details</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <span className="text-slate-400 block font-medium">Hospital Name</span>
            <span className="text-slate-800 font-semibold text-sm">{hospital?.name || "N/A"}</span>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <span className="text-slate-400 block font-medium">Emergency Contact</span>
            <span className="text-slate-800 font-semibold text-sm">{hospital?.contact_phone || "N/A"}</span>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 sm:col-span-2">
            <span className="text-slate-400 block font-medium">Tenant UUID (RLS Scope)</span>
            <span className="text-slate-600 font-mono text-xs break-all">{hospital?.id || "N/A"}</span>
          </div>
        </div>
      </div>

      {/* Time Control Card (Preview for Phase 3 fast forward) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Simulated Time Control</h2>
            <p className="text-xs text-slate-400">Demo accelerator for recovery window & caregiver alerts</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FastForward className="h-4 w-4 text-teal-600" />
            <span>Fast-forward controls (+3h, +1d, +1w) will be active in Phase 3.</span>
          </div>
          <span className="text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
            Current Offset: +0h
          </span>
        </div>
      </div>
    </div>
  );
}

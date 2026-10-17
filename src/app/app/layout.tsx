import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity, LayoutDashboard, Building2, Users, Settings, LogOut, ChevronRight, Stethoscope } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { t } from "@/lib/i18n";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user profile and hospital
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, hospital_id")
    .eq("id", user.id)
    .single();

  const { data: hospital } = profile?.hospital_id
    ? await supabase
        .from("hospitals")
        .select("name, contact_phone")
        .eq("id", profile.hospital_id)
        .single()
    : { data: null };

  // Fetch departments for sidebar list
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .order("name", { ascending: true });

  // Fetch count of open priority alerts for hospital tenant
  const { count: openAlertCount } = await supabase
    .from("alerts")
    .select("*", { count: "exact", head: true })
    .in("status", ["open", "acknowledged"]);

  const alertCount = openAlertCount || 0;

  const hospitalName = hospital?.name || "CareAfter Network Hospital";
  const staffName = profile?.full_name || user.email || "Hospital Staff";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      <div className="flex-1 flex">
        {/* Left Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0">
          <div>
            {/* Hospital Branding Header */}
            <div className="p-5 border-b border-slate-100">
              <Link href="/app/dashboard" className="flex items-center gap-2.5 mb-3">
                <div className="h-9 w-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <Activity className="h-5 w-5" />
                </div>
                <div className="leading-tight">
                  <span className="font-bold text-slate-900 tracking-tight block">CareAfter</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-teal-600">
                    Post-Discharge Care
                  </span>
                </div>
              </Link>

              {/* Hospital Badge */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                  Tenant Hospital
                </div>
                <div className="text-xs font-bold text-slate-800 truncate" title={hospitalName}>
                  {hospitalName}
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="p-3 space-y-1">
              <Link
                href="/app/dashboard"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <LayoutDashboard className="h-4 w-4 text-slate-400" />
                <span className="flex-1">{t("nav.dashboard")}</span>
                {Boolean(openAlertCount && openAlertCount > 0) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse shadow-xs">
                    {openAlertCount}
                  </span>
                )}
              </Link>

              <Link
                href="/app/departments"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <Building2 className="h-4 w-4 text-slate-400" />
                <span>{t("nav.departments")}</span>
              </Link>

              <Link
                href="/app/patients"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <Users className="h-4 w-4 text-slate-400" />
                <span className="flex-1">{t("nav.patients")}</span>
                {alertCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                    {alertCount} alert{alertCount > 1 ? "s" : ""}
                  </span>
                )}
              </Link>

              <Link
                href="/app/settings"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <Settings className="h-4 w-4 text-slate-400" />
                <span>{t("nav.settings")}</span>
              </Link>
            </nav>

            {/* Departments Quick Section */}
            <div className="px-5 pt-4 pb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Departments ({departments?.length || 0})
                </span>
                <Link
                  href="/app/departments"
                  className="text-xs text-teal-600 font-semibold hover:underline"
                >
                  Manage
                </Link>
              </div>
              <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
                {departments && departments.length > 0 ? (
                  departments.map((dept) => (
                    <Link
                      key={dept.id}
                      href={`/app/departments/${dept.id}`}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-slate-600 hover:bg-slate-50 hover:text-teal-700 transition-colors group"
                    >
                      <span className="truncate">{dept.name}</span>
                      <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 text-slate-400 shrink-0" />
                    </Link>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 italic py-1 px-1">
                    No departments added
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Profile & Sign Out Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
                <Stethoscope className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-900 truncate" title={staffName}>
                  {staffName}
                </div>
                <div className="text-[11px] text-slate-500 truncate" title={user.email}>
                  {user.email}
                </div>
              </div>
            </div>

            <form action={signOut}>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-white hover:text-red-600 hover:border-red-200 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                {t("nav.signOut")}
              </button>
            </form>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-slate-700">
                {hospitalName}
              </h2>
            </div>
          </header>

          {alertCount > 0 && (
            <div className="bg-rose-600 text-white px-8 py-2.5 flex items-center justify-between text-xs font-semibold shadow-xs shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                </span>
                <span>
                  <strong>CRITICAL PATIENT ALERT:</strong> {alertCount} post-discharge patient{alertCount > 1 ? "s" : ""} reported severe/urgent symptoms requiring clinical assessment.
                </span>
              </div>
              <Link
                href="/app/dashboard"
                className="px-3 py-1 rounded bg-white text-rose-700 hover:bg-rose-50 font-bold transition-colors shadow-xs"
              >
                Review Triage Stream →
              </Link>
            </div>
          )}

          {/* Page Body */}
          <main className="flex-1 p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <footer className="border-t border-slate-200 bg-white py-3 px-8 text-center shrink-0">
        <p className="text-xs font-medium text-slate-400">
          {t("common.disclaimer")}
        </p>
      </footer>
    </div>
  );
}

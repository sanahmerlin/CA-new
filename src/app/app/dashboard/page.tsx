import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";
import { getNow } from "@/lib/time";

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Departments count
  const { count: departmentCount } = await supabase
    .from("departments")
    .select("*", { count: "exact", head: true });

  // 2. Enrolled patients count
  const { count: patientCount } = await supabase
    .from("patients")
    .select("*", { count: "exact", head: true });

  // 3. Active checkin cycles count
  const { count: activeCheckinCount } = await supabase
    .from("checkins")
    .select("*", { count: "exact", head: true })
    .in("status", ["active", "sent"]);

  // 4. Open Priority alerts
  const { data: alerts } = await supabase
    .from("alerts")
    .select(`
      id,
      severity,
      reasons,
      source,
      status,
      created_at,
      patient_id,
      patients (
        id,
        full_name,
        age,
        sex,
        plan_tier,
        patient_phone,
        departments (
          name
        )
      )
    `)
    .in("status", ["open", "acknowledged"])
    .order("created_at", { ascending: false });

  const formattedAlerts = (alerts || []).map((a: any) => ({
    id: a.id,
    severity: a.severity,
    reasons: a.reasons,
    source: a.source,
    status: a.status,
    created_at: a.created_at,
    patient_id: a.patient_id,
    patient: Array.isArray(a.patients) ? a.patients[0] : a.patients,
  }));

  const simulatedNow = await getNow();
  const dateString = simulatedNow.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <DashboardClient
      initialAlerts={formattedAlerts}
      patientCount={patientCount ?? 0}
      activeCheckinCount={activeCheckinCount ?? 0}
      departmentCount={departmentCount ?? 0}
      initialSimulatedDateString={dateString}
    />
  );
}

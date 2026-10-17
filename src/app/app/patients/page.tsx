import { createClient } from "@/lib/supabase/server";
import { PatientsClient } from "./patients-client";

export default async function PatientsPage() {
  const supabase = await createClient();

  // Fetch all patients for the authenticated hospital tenant, including active alerts
  const { data: patients } = await supabase
    .from("patients")
    .select(`
      id,
      full_name,
      age,
      sex,
      patient_phone,
      discharge_date,
      status,
      created_at,
      department_id,
      departments (
        id,
        name
      ),
      patient_records (
        diagnosis
      ),
      alerts (
        id,
        severity,
        status,
        reasons,
        created_at
      )
    `)
    .order("created_at", { ascending: false });

  // Fetch departments for filtering dropdown
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .order("name", { ascending: true });

  const formattedPatients = (patients || []).map((p: any) => {
    const rawAlerts = Array.isArray(p.alerts) ? p.alerts : [];
    const activeAlerts = rawAlerts.filter(
      (a: any) => a.status === "open" || a.status === "acknowledged"
    );

    const hasCritical = activeAlerts.some((a: any) => a.severity === "critical");
    const hasUrgent = activeAlerts.some((a: any) => a.severity === "urgent");
    const hasWatch = activeAlerts.some((a: any) => a.severity === "watch");

    const highestAlertSeverity: "critical" | "urgent" | "watch" | null = hasCritical
      ? "critical"
      : hasUrgent
      ? "urgent"
      : hasWatch
      ? "watch"
      : null;

    return {
      id: p.id,
      full_name: p.full_name,
      age: p.age,
      sex: p.sex,
      patient_phone: p.patient_phone,
      discharge_date: p.discharge_date,
      status: p.status,
      created_at: p.created_at,
      department_id: p.department_id,
      department: p.departments,
      record: Array.isArray(p.patient_records) ? p.patient_records[0] : p.patient_records,
      activeAlerts,
      highestAlertSeverity,
    };
  });

  // Prioritize patients who need immediate clinical attention (critical > urgent > watch > stable)
  formattedPatients.sort((a, b) => {
    const score = (sev: string | null) => {
      if (sev === "critical") return 3;
      if (sev === "urgent") return 2;
      if (sev === "watch") return 1;
      return 0;
    };
    const diff = score(b.highestAlertSeverity) - score(a.highestAlertSeverity);
    if (diff !== 0) return diff;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  return <PatientsClient patients={formattedPatients} departments={departments || []} />;
}

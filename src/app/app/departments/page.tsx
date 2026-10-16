import { createClient } from "@/lib/supabase/server";
import { DepartmentsClient } from "./departments-client";

export default async function DepartmentsPage() {
  const supabase = await createClient();

  const { data: departments } = await supabase
    .from("departments")
    .select(`
      id,
      name,
      created_at,
      patients (count)
    `)
    .order("name", { ascending: true });

  const formatted = (departments || []).map((d: any) => ({
    id: d.id,
    name: d.name,
    created_at: d.created_at,
    patient_count: d.patients?.[0]?.count ?? 0,
  }));

  return <DepartmentsClient departments={formatted} />;
}

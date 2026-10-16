import { createClient } from "@/lib/supabase/server";
import { DepartmentsClient } from "./departments-client";

export default async function DepartmentsPage() {
  const supabase = await createClient();

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name, created_at")
    .order("name", { ascending: true });

  return <DepartmentsClient departments={departments || []} />;
}

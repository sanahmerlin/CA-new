import { createClient } from "@/lib/supabase/server";
import { EnrolClient } from "./enrol-client";

export default async function EnrolPatientPage() {
  const supabase = await createClient();

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .order("name", { ascending: true });

  return <EnrolClient departments={departments || []} />;
}

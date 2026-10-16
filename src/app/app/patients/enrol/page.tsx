import { createClient } from "@/lib/supabase/server";
import { EnrolClient } from "./enrol-client";

export default async function EnrolPatientPage(props: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .order("name", { ascending: true });

  return (
    <EnrolClient
      departments={departments || []}
      initialMode={searchParams?.mode === "bulk" ? "bulk" : "single"}
    />
  );
}

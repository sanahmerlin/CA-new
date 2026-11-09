import { createServiceClient } from "@/lib/supabase/service";

/**
 * Checks server-side whether a given patient has an active Care+ subscription.
 * Uses the Supabase service role client to ensure secure and authoritative status.
 */
export async function isCarePlusActive(patientId: string): Promise<boolean> {
  if (!patientId) return false;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("patient_id", patientId)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error querying subscriptions for Care+ status:", error);
      return false;
    }

    return data?.status === "ACTIVE";
  } catch (err) {
    console.error("Exception checking Care+ subscription status:", err);
    return false;
  }
}

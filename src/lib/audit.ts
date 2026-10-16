import { createClient } from "./supabase/server";

export async function writeAudit(
  action: string,
  entity: string,
  entityId?: string | null
): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn("writeAudit called without authenticated user session");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("hospital_id")
      .eq("id", user.id)
      .single();

    if (!profile?.hospital_id) {
      console.warn(`writeAudit: no profile found for user ${user.id}`);
      return;
    }

    await supabase.from("audit_log").insert({
      hospital_id: profile.hospital_id,
      user_id: user.id,
      action,
      entity,
      entity_id: entityId ?? null,
    });
  } catch (err) {
    console.error("writeAudit error:", err);
  }
}

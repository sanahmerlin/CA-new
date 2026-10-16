import { createClient } from "./supabase/server";

// In-memory fallback offset in minutes (per-instance fast lookup)
let inMemoryOffsetMinutes = 0;

/**
 * Returns current simulated Date.
 * Adds simulated offset minutes if configured in database or in-memory fallback.
 * Every time-based decision in Phase 3 uses getNow().
 */
export async function getNow(): Promise<Date> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("hospital_id")
        .eq("id", user.id)
        .single();

      if (profile?.hospital_id) {
        const { data: settings } = await supabase
          .from("app_settings")
          .select("simulated_time_offset_minutes")
          .eq("hospital_id", profile.hospital_id)
          .maybeSingle();

        if (settings && typeof settings.simulated_time_offset_minutes === "number") {
          inMemoryOffsetMinutes = settings.simulated_time_offset_minutes;
          return new Date(Date.now() + settings.simulated_time_offset_minutes * 60 * 1000);
        }
      }
    }

    return new Date(Date.now() + inMemoryOffsetMinutes * 60 * 1000);
  } catch {
    return new Date(Date.now() + inMemoryOffsetMinutes * 60 * 1000);
  }
}

/**
 * Fast synchronous getNow for client or utility usage
 */
export function getNowSync(): Date {
  return new Date(Date.now() + inMemoryOffsetMinutes * 60 * 1000);
}


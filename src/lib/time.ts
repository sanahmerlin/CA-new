import { createClient } from "./supabase/server";

/**
 * Returns current simulated Date.
 * Adds simulated offset hours if configured in database, else returns new Date().
 */
export async function getNow(): Promise<Date> {
  try {
    const supabase = await createClient();
    const { data: settings } = await supabase
      .from("app_settings" as any)
      .select("simulated_time_offset_hours")
      .limit(1)
      .maybeSingle();

    const offsetHours = (settings as any)?.simulated_time_offset_hours ?? 0;
    const now = new Date();
    if (offsetHours !== 0) {
      now.setHours(now.getHours() + offsetHours);
    }
    return now;
  } catch {
    return new Date();
  }
}

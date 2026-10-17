"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function acknowledgeAlert(alertId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { error } = await supabase
      .from("alerts")
      .update({ status: "acknowledged" })
      .eq("id", alertId);

    if (error) return { error: error.message };

    revalidatePath("/app/dashboard");
    revalidatePath("/app/patients");
    revalidatePath("/app", "layout");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function resolveAlert(alertId: string, note?: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { error } = await supabase
      .from("alerts")
      .update({
        status: "resolved",
        resolved_note: note || "Resolved by clinical staff",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", alertId);

    if (error) return { error: error.message };

    revalidatePath("/app/dashboard");
    revalidatePath("/app/patients");
    revalidatePath("/app", "layout");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function advanceSimulatedTime(minutesToAdd: number) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("hospital_id")
      .eq("id", user.id)
      .single();

    if (!profile?.hospital_id) return { error: "Hospital not found" };

    const { data: existing } = await supabase
      .from("app_settings")
      .select("simulated_time_offset_minutes")
      .eq("hospital_id", profile.hospital_id)
      .maybeSingle();

    const currentOffset = existing?.simulated_time_offset_minutes ?? 0;
    const newOffset = currentOffset + minutesToAdd;

    await supabase
      .from("app_settings")
      .upsert({
        hospital_id: profile.hospital_id,
        simulated_time_offset_minutes: newOffset,
        updated_at: new Date().toISOString(),
      });

    revalidatePath("/app", "layout");
    return { success: true, newOffsetMinutes: newOffset };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function resetSimulatedTime() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("hospital_id")
      .eq("id", user.id)
      .single();

    if (!profile?.hospital_id) return { error: "Hospital not found" };

    await supabase
      .from("app_settings")
      .upsert({
        hospital_id: profile.hospital_id,
        simulated_time_offset_minutes: 0,
        updated_at: new Date().toISOString(),
      });

    revalidatePath("/app", "layout");
    return { success: true, newOffsetMinutes: 0 };
  } catch (err: any) {
    return { error: err.message };
  }
}


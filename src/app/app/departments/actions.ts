"use server";

import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function createDepartment(name: string) {
  if (!name || !name.trim()) {
    return { error: "Department name cannot be empty." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("hospital_id")
    .eq("id", user.id)
    .single();

  if (!profile?.hospital_id) {
    return { error: "Hospital profile not found." };
  }

  const { data, error } = await supabase
    .from("departments")
    .insert({
      hospital_id: profile.hospital_id,
      name: name.trim(),
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  await writeAudit("CREATE", "departments", data.id);

  revalidatePath("/app/departments");
  revalidatePath("/app/dashboard");
  revalidatePath("/app", "layout");

  return { success: true };
}

export async function renameDepartment(id: string, newName: string) {
  if (!newName || !newName.trim()) {
    return { error: "Department name cannot be empty." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("departments")
    .update({ name: newName.trim() })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  await writeAudit("UPDATE", "departments", id);

  revalidatePath("/app/departments");
  revalidatePath(`/app/departments/${id}`);
  revalidatePath("/app", "layout");

  return { success: true };
}

export async function deleteDepartment(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("departments")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  await writeAudit("DELETE", "departments", id);

  revalidatePath("/app/departments");
  revalidatePath("/app/dashboard");
  revalidatePath("/app", "layout");

  return { success: true };
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { redirect } from "next/navigation";

export async function login(prevState: { error?: string } | null, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please enter both email and password." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: error?.message || "Invalid credentials." };
  }

  // Audit log login
  await writeAudit("LOGIN", "auth.users", data.user.id);

  redirect("/app/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

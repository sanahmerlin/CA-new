import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";
import bcrypt from "bcryptjs";
import type { Database } from "../src/lib/supabase/types";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY);

async function backfill() {
  console.log("🔐 Starting Patient Credentials Backfill...\n");

  const { data: patients, error } = await supabase
    .from("patients")
    .select("id, full_name, age");

  if (error) {
    console.error("Error fetching patients:", error.message);
    return;
  }

  console.log(`Found ${patients?.length || 0} patients in database.`);

  const usedUsernames = new Set<string>();

  for (const patient of patients || []) {
    const cleanParts = patient.full_name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter(Boolean);

    const baseUsername = cleanParts.length > 0 ? cleanParts.join(".") : `patient.${patient.id.slice(0, 4)}`;
    let chosenUsername = baseUsername;
    let counter = 2;

    while (usedUsernames.has(chosenUsername)) {
      chosenUsername = `${baseUsername}${counter}`;
      counter++;
    }
    usedUsernames.add(chosenUsername);

    const firstName = cleanParts[0] || "patient";
    const plainPassword = `${firstName}${patient.age || 45}`;
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const { error: updateError } = await supabase
      .from("patients")
      .update({
        username: chosenUsername,
        password_hash: passwordHash,
      })
      .eq("id", patient.id);

    if (updateError) {
      console.error(`❌ Failed to update ${patient.full_name}:`, updateError.message);
    } else {
      console.log(`✅ Backfilled: ${patient.full_name.padEnd(20)} -> Username: ${chosenUsername.padEnd(20)} Password: ${plainPassword}`);
    }
  }

  console.log("\n🎉 All patient credentials backfilled successfully!");
}

backfill().catch(console.error);

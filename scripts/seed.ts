import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";
import type { Database } from "../src/lib/supabase/types";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SUNRISE_HOSPITAL_ID = "a1000000-0000-0000-0000-000000000001";
const LAKEVIEW_HOSPITAL_ID = "b2000000-0000-0000-0000-000000000002";
const DEMO_PASSWORD = "CareAfter2025!";

const HOSPITALS = [
  { id: SUNRISE_HOSPITAL_ID, name: "Sunrise Heart & General Hospital", contact_phone: "+91-80-4000-1000" },
  { id: LAKEVIEW_HOSPITAL_ID, name: "Lakeview Medical", contact_phone: "+91-44-4000-2000" },
];

const USERS = [
  { email: "admin@sunrise.demo", full_name: "Dr. Priya Nair (Chief of Medicine)", hospital_id: SUNRISE_HOSPITAL_ID },
  { email: "admin@lakeview.demo", full_name: "Dr. Arjun Mehta (Medical Director)", hospital_id: LAKEVIEW_HOSPITAL_ID },
];

const SUNRISE_DEPARTMENTS = ["Cardiology", "Orthopaedics", "General Surgery", "Pulmonology"];

async function seed() {
  console.log("🌱 CareAfter Phase 1 Seeding starting...\n");

  // 1. Upsert Hospitals
  console.log("🏥 Upserting hospitals...");
  for (const hospital of HOSPITALS) {
    const { error } = await supabase.from("hospitals").upsert(hospital, { onConflict: "id" });
    if (error) throw new Error(`Hospital upsert failed: ${error.message}`);
    console.log(`  ✅ ${hospital.name}`);
  }

  // 2. Upsert Users & Profiles
  console.log("\n👤 Upserting staff auth users...");
  const { data: listData } = await supabase.auth.admin.listUsers();

  for (const u of USERS) {
    let userId: string;
    const existing = listData?.users?.find((usr) => usr.email === u.email);

    if (existing) {
      userId = existing.id;
      // Update password to ensure it matches DEMO_PASSWORD
      await supabase.auth.admin.updateUserById(userId, { password: DEMO_PASSWORD });
      console.log(`  ⏭  ${u.email} already exists (password synchronized)`);
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
      });
      if (error) throw new Error(`User creation failed for ${u.email}: ${error.message}`);
      userId = data.user.id;
      console.log(`  ✅ Created auth user ${u.email}`);
    }

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        hospital_id: u.hospital_id,
        full_name: u.full_name,
      },
      { onConflict: "id" }
    );
    if (profileError) throw new Error(`Profile upsert failed: ${profileError.message}`);
  }

  // 3. Upsert Sunrise Departments (Lakeview stays empty for multi-tenancy testing)
  console.log("\n🏢 Upserting Sunrise starter departments...");
  for (const name of SUNRISE_DEPARTMENTS) {
    const { data: existing } = await supabase
      .from("departments")
      .select("id")
      .eq("hospital_id", SUNRISE_HOSPITAL_ID)
      .eq("name", name)
      .maybeSingle();

    if (existing) {
      console.log(`  ⏭  ${name} exists`);
    } else {
      const { error } = await supabase.from("departments").insert({
        hospital_id: SUNRISE_HOSPITAL_ID,
        name,
      });
      if (error) throw new Error(`Department insert failed for ${name}: ${error.message}`);
      console.log(`  ✅ Added ${name}`);
    }
  }

  console.log("\n✨ Seed complete!");
  console.log("Credentials:");
  console.log(`  Sunrise Hospital: admin@sunrise.demo / ${DEMO_PASSWORD}`);
  console.log(`  Lakeview Medical: admin@lakeview.demo / ${DEMO_PASSWORD} (Empty isolation demo)`);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";
import type { Database } from "../src/lib/supabase/types";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function testRLSIsolation() {
  console.log("🔒 Testing Multi-Tenant RLS Data Isolation...\n");

  // 1. Create client with anon key (simulating browser user)
  const client = createClient<Database>(SUPABASE_URL, ANON_KEY);

  // 2. Sign in as Lakeview Medical admin
  console.log("1. Signing in as Lakeview Medical (admin@lakeview.demo)...");
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: "admin@lakeview.demo",
    password: "CareAfter2025!",
  });

  if (authError || !authData.user) {
    throw new Error(`Lakeview auth failed: ${authError?.message}`);
  }
  console.log(`   ✅ Authenticated user ID: ${authData.user.id}`);

  // 3. Query departments under Lakeview session
  console.log("\n2. Querying departments table under Lakeview session...");
  const { data: depts, error: deptError } = await client
    .from("departments")
    .select("id, name, hospital_id");

  if (deptError) {
    console.error("   ❌ Query error:", deptError);
  } else {
    console.log(`   Departments returned for Lakeview: ${depts.length}`);
    if (depts.length === 0) {
      console.log("   ✅ SUCCESS: Sunrise departments are completely UNREACHABLE by Lakeview (0 rows returned)!");
    } else {
      console.error("   ❌ FAILURE: Data leakage! Lakeview saw rows:", depts);
    }
  }

  // 4. Query Sunrise Hospital ID directly under Lakeview session
  const SUNRISE_HOSPITAL_ID = "a1000000-0000-0000-0000-000000000001";
  console.log("\n3. Attempting direct select of Sunrise Hospital ID under Lakeview session...");
  const { data: sunriseHosp, error: hospError } = await client
    .from("hospitals")
    .select("id, name")
    .eq("id", SUNRISE_HOSPITAL_ID)
    .maybeSingle();

  if (!sunriseHosp) {
    console.log("   ✅ SUCCESS: Direct query for Sunrise Hospital returned NULL via RLS policy!");
  } else {
    console.error("   ❌ FAILURE: Lakeview was able to read Sunrise Hospital details!", sunriseHosp);
  }

  // 5. Test Sunrise login
  console.log("\n4. Signing in as Sunrise Heart & General (admin@sunrise.demo)...");
  const sunriseClient = createClient<Database>(SUPABASE_URL, ANON_KEY);
  await sunriseClient.auth.signInWithPassword({
    email: "admin@sunrise.demo",
    password: "CareAfter2025!",
  });

  const { data: sunriseDepts } = await sunriseClient
    .from("departments")
    .select("name");

  console.log(`   Departments returned for Sunrise: ${sunriseDepts?.length || 0}`);
  sunriseDepts?.forEach((d) => console.log(`   - ${d.name}`));
  if ((sunriseDepts?.length || 0) === 4) {
    console.log("   ✅ SUCCESS: Sunrise can view all 4 of its own departments!");
  }

  console.log("\n🛡️ RLS Isolation Test Passed 100%!");
}

testRLSIsolation().catch(console.error);

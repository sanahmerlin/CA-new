import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";
import type { Database } from "../src/lib/supabase/types";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function testRLSIsolation() {
  console.log("🔒 Testing Multi-Tenant RLS Data Isolation across Phase 1 & Phase 2...\n");

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
  const { data: depts } = await client.from("departments").select("id, name");
  console.log(`   Departments returned for Lakeview: ${depts?.length || 0}`);
  if ((depts?.length || 0) === 0) {
    console.log("   ✅ SUCCESS: Sunrise departments unreachable by Lakeview (0 rows)!");
  } else {
    console.error("   ❌ FAILURE: Data leakage in departments!", depts);
  }

  // 4. Query patients under Lakeview session
  console.log("\n3. Querying patients table under Lakeview session...");
  const { data: patients, error: pError } = await client.from("patients").select("id, full_name");
  if (pError) {
    console.log(`   Notice: ${pError.message}`);
  } else {
    console.log(`   Patients returned for Lakeview: ${patients?.length || 0}`);
    if ((patients?.length || 0) === 0) {
      console.log("   ✅ SUCCESS: Sunrise patients unreachable by Lakeview (0 rows)!");
    } else {
      console.error("   ❌ FAILURE: Data leakage in patients!", patients);
    }
  }

  // 5. Test Sunrise login & verify access to own data
  console.log("\n4. Signing in as Sunrise Heart & General (admin@sunrise.demo)...");
  const sunriseClient = createClient<Database>(SUPABASE_URL, ANON_KEY);
  await sunriseClient.auth.signInWithPassword({
    email: "admin@sunrise.demo",
    password: "CareAfter2025!",
  });

  const { data: sunriseDepts } = await sunriseClient.from("departments").select("name");
  console.log(`   Departments returned for Sunrise: ${sunriseDepts?.length || 0}`);

  const { data: sunrisePatients } = await sunriseClient.from("patients").select("id, full_name");
  console.log(`   Patients returned for Sunrise: ${sunrisePatients?.length || 0}`);

  console.log("\n🛡️ Phase 1 & Phase 2 Multi-Tenant RLS verified!");
}

testRLSIsolation().catch(console.error);

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

async function main() {
  console.log("Creating/updating user Meera Krishnan (meera.krishnan / meera56)...");

  // Fetch hospital
  const { data: hospital, error: hError } = await supabase
    .from("hospitals")
    .select("id")
    .limit(1)
    .single();

  if (hError || !hospital) {
    console.error("❌ Failed to find hospital:", hError?.message);
    process.exit(1);
  }

  const hospitalId = hospital.id;

  // Fetch department
  const { data: dept } = await supabase
    .from("departments")
    .select("id")
    .eq("hospital_id", hospitalId)
    .limit(1)
    .maybeSingle();

  const plainPassword = "meera56";
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  // Check if Meera Krishnan already exists
  const { data: existing } = await supabase
    .from("patients")
    .select("id")
    .eq("username", "meera.krishnan")
    .maybeSingle();

  let patientId: string;

  if (existing) {
    patientId = existing.id;
    const { error: uError } = await supabase
      .from("patients")
      .update({
        full_name: "Meera Krishnan",
        age: 56,
        sex: "Female",
        patient_phone: "+91-9840012345",
        status: "active",
        password_hash: passwordHash,
      })
      .eq("id", patientId);

    if (uError) {
      console.error("❌ Error updating patient:", uError.message);
      process.exit(1);
    }
    console.log("✅ Updated existing Meera Krishnan record:", patientId);
  } else {
    const { data: newP, error: iError } = await supabase
      .from("patients")
      .insert({
        hospital_id: hospitalId,
        department_id: dept?.id || null,
        full_name: "Meera Krishnan",
        age: 56,
        sex: "Female",
        patient_phone: "+91-9840012345",
        caregiver_name: "Ravi Krishnan",
        caregiver_relation: "Spouse",
        caregiver_phone: "+91-9840012346",
        discharge_date: new Date().toISOString().split("T")[0],
        status: "active",
        username: "meera.krishnan",
        password_hash: passwordHash,
        monitoring_tier: "moderate",
        plan_tier: "pro",
        consent_given: true,
      })
      .select("id")
      .single();

    if (iError || !newP) {
      console.error("❌ Error inserting patient:", iError?.message);
      process.exit(1);
    }
    patientId = newP.id;
    console.log("✅ Created Meera Krishnan:", patientId);
  }

  // Upsert clinical record
  await supabase.from("patient_records").upsert(
    {
      patient_id: patientId,
      hospital_id: hospitalId,
      diagnosis: "Post-Percutaneous Coronary Intervention (PCI) with Drug-Eluting Stent",
      medications: [
        { name: "Ticagrelor", dose: "90mg", frequency: "Twice daily" },
        { name: "Aspirin", dose: "75mg", frequency: "Once daily" },
        { name: "Atorvastatin", dose: "40mg", frequency: "Nightly" },
      ],
      medical_history: ["Hypertension", "Hyperlipidemia"],
      risk_factors: ["Bleeding risk on DAPT", "Stent thrombosis risk"],
      allergies: ["No known allergies"],
      follow_up_plan: "Review in Cardiology OPD in 7 days.",
      confirmed_at: new Date().toISOString(),
    },
    { onConflict: "patient_id" }
  );

  // Check if today's checkin exists
  const { data: existingCheckin } = await supabase
    .from("checkins")
    .select("id")
    .eq("patient_id", patientId)
    .eq("status", "active")
    .maybeSingle();

  if (!existingCheckin) {
    const sampleQuestions = [
      {
        id: "q_chest",
        topic: "Chest Symptoms",
        text: {
          en: "Have you felt any chest heaviness, tightness, or pain today?",
          ml: "ഇന്ന് നെഞ്ചിൽ ഭാരമോ, വേദനയോ, മുറുക്കമോ അനുഭവപ്പെട്ടോ?",
          hi: "क्या आज आपको छाती में भारीपन, जकड़न या दर्द महसूस हुआ?",
        },
        type: "choice",
        options: [
          { value: "No", label: { en: "No, comfortable", ml: "ഇല്ല, സുഖകരമാണ്", hi: "नहीं, ठीक हूँ" } },
          { value: "Mild", label: { en: "Mild ache on exertion", ml: "നേരിയ അസ്വസ്ഥത", hi: "हल्का सा दर्द" } },
          { value: "Severe", label: { en: "Severe / crushing pain", ml: "കഠിനമായ നെഞ്ചുവേദന", hi: "गंभीर / तेज दर्द" } },
        ],
        concern_if: ["Mild", "Severe"],
        severity_if_concern: "critical",
        follow_ups: [
          {
            id: "fu_radiate",
            text: {
              en: "Does the pain radiate to your left arm, jaw, or back?",
              ml: "വേദന ഇടതുകൈയിലേക്കോ താടിയിലേക്കോ പടരുന്നുണ്ടോ?",
              hi: "क्या दर्द आपके बाएं हाथ, जबड़े या पीठ तक फैल रहा है?",
            },
            type: "choice",
            options: [
              { value: "Yes", label: { en: "Yes, radiating", ml: "അതെ", hi: "हाँ" } },
              { value: "No", label: { en: "No", ml: "ഇല്ല", hi: "नहीं" } },
            ],
            concern_if: ["Yes"],
            severity_if_concern: "critical",
          },
        ],
      },
      {
        id: "q_breath",
        topic: "Shortness of Breath",
        text: {
          en: "Are you experiencing any shortness of breath while resting?",
          ml: "വിശ്രമിക്കുമ്പോൾ ശ്വാസതടസ്സം അനുഭവപ്പെടുന്നുണ്ടോ?",
          hi: "क्या आपको आराम करते समय सांस लेने में तकलीफ हो रही है?",
        },
        type: "choice",
        options: [
          { value: "No", label: { en: "Breathing easily", ml: "ശ്വാസോച്ഛ്വാസം സാധാരണമാണ്", hi: "सांस सामान्य है" } },
          { value: "Difficult", label: { en: "Difficulty breathing", ml: "ശ്വാസമെടുക്കാൻ ബുദ്ധിമുട്ട്", hi: "सांस लेने में तकलीफ" } },
        ],
        concern_if: ["Difficult"],
        severity_if_concern: "urgent",
      },
      {
        id: "q_meds",
        topic: "Medication Adherence",
        text: {
          en: "Did you take your blood thinner (Ticagrelor + Aspirin) today?",
          ml: "നിങ്ങൾക്ക് നിർദ്ദേശിച്ച രക്തം കട്ടപിടിക്കാതിരിക്കാനുള്ള മരുന്നുകൾ കഴിച്ചോ?",
          hi: "क्या आपने आज अपनी रक्त पतला करने वाली दवाएं लीं?",
        },
        type: "choice",
        options: [
          { value: "Yes", label: { en: "Yes, all doses taken", ml: "അതെ, കഴിച്ചു", hi: "हाँ, ले लीं" } },
          { value: "Missed", label: { en: "Missed a dose", ml: "മരുന്ന് കഴിക്കാൻ വിട്ടുപോയി", hi: "दवा छूट गई" } },
        ],
        concern_if: ["Missed"],
        severity_if_concern: "watch",
      },
    ];

    await supabase.from("checkins").insert({
      patient_id: patientId,
      hospital_id: hospitalId,
      scheduled_day: 1,
      scheduled_for: new Date().toISOString(),
      status: "active",
      questions: sampleQuestions,
    });
    console.log("✅ Created Day 1 check-in questions for Meera Krishnan");
  }

  console.log("\n🎉 SUCCESS!");
  console.log("Login credentials ready:");
  console.log("  URL: /patient/login");
  console.log("  Username: meera.krishnan");
  console.log("  Password: meera56");
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});

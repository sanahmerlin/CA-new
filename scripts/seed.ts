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

// 10 realistic seeded patients for Sunrise Heart & General Hospital
const PATIENT_DATA = [
  {
    id: "p1000000-0000-0000-0000-000000000001",
    department: "Cardiology",
    full_name: "Rajesh Sharma",
    age: 62,
    sex: "Male",
    patient_phone: "+91-9845012341",
    caregiver_name: "Sunita Sharma",
    caregiver_relation: "Spouse",
    caregiver_phone: "+91-9845012342",
    discharge_date: "2026-10-15",
    diagnosis: "Coronary Artery Bypass Graft (CABG x 3) for Severe Triple Vessel Disease",
    medications: [
      { name: "Aspirin", dose: "75mg", frequency: "Once daily" },
      { name: "Clopidogrel", dose: "75mg", frequency: "Once daily" },
      { name: "Atorvastatin", dose: "40mg", frequency: "At bedtime" },
      { name: "Metoprolol succinate", dose: "25mg", frequency: "Once daily morning" },
    ],
    medical_history: ["Type 2 Diabetes Mellitus", "Hypertension", "Dyslipidemia"],
    risk_factors: ["Post-sternotomy wound infection risk", "Diabetic healing delay"],
    allergies: ["NKDA (No known drug allergies)"],
    follow_up_plan: "Sternal wound review in CTVS OPD in 7 days. Echocardiogram in 4 weeks.",
    raw_history_text: "62yo diabetic male post-CABG x3. Discharged hemodynamically stable. Sternal precautions advised.",
  },
  {
    id: "p1000000-0000-0000-0000-000000000002",
    department: "Cardiology",
    full_name: "Mary Varghese",
    age: 71,
    sex: "Female",
    patient_phone: "+91-9845012343",
    caregiver_name: "Thomas Varghese",
    caregiver_relation: "Son",
    caregiver_phone: "+91-9845012344",
    discharge_date: "2026-10-14",
    diagnosis: "Acute Decompensated Heart Failure (HFrEF, EF 32%), resolved pulmonary edema",
    medications: [
      { name: "Furosemide", dose: "40mg", frequency: "Twice daily" },
      { name: "Entresto (Sacubitril/Valsartan)", dose: "24/26mg", frequency: "Twice daily" },
      { name: "Spironolactone", dose: "25mg", frequency: "Once daily" },
      { name: "Empagliflozin", dose: "10mg", frequency: "Once daily" },
    ],
    medical_history: ["Dilated Cardiomyopathy", "CKD Stage 3a"],
    risk_factors: ["Fluid retention vulnerability", "Hyperkalemia risk", "High readmission tier"],
    allergies: ["Penicillin"],
    follow_up_plan: "Cardiology clinic visit with repeat serum electrolytes & creatinine in 5 days.",
    raw_history_text: "71yo female admitted with acute orthopnea and bilateral pedal edema. Responded well to IV diuretics.",
  },
  {
    id: "p1000000-0000-0000-0000-000000000003",
    department: "Cardiology",
    full_name: "Vikram Malhotra",
    age: 55,
    sex: "Male",
    patient_phone: "+91-9845012345",
    caregiver_name: "Ritu Malhotra",
    caregiver_relation: "Spouse",
    caregiver_phone: "+91-9845012346",
    discharge_date: "2026-10-16",
    diagnosis: "Acute Anterior Wall STEMI s/p Primary PCI with DES to LAD",
    medications: [
      { name: "Ticagrelor", dose: "90mg", frequency: "Twice daily" },
      { name: "Aspirin", dose: "75mg", frequency: "Once daily" },
      { name: "Rosuvastatin", dose: "20mg", frequency: "At bedtime" },
      { name: "Ramipril", dose: "2.5mg", frequency: "Once daily" },
    ],
    medical_history: ["Smoker (active cessation)", "Hypercholesterolemia"],
    risk_factors: ["Stent thrombosis risk", "Post-PCI hematoma at radial access site"],
    allergies: ["No known allergies"],
    follow_up_plan: "Cardiology OPD in 10 days with ECG. Cardiac rehabilitation program starts week 3.",
    raw_history_text: "55M presented with acute retrosternal chest pain. Urgent angiography revealed 95% LAD thrombotic occlusion.",
  },
  {
    id: "p1000000-0000-0000-0000-000000000004",
    department: "Orthopaedics",
    full_name: "Sundararajan K",
    age: 58,
    sex: "Male",
    patient_phone: "+91-9845012347",
    caregiver_name: "Kavitha S",
    caregiver_relation: "Daughter",
    caregiver_phone: "+91-9845012348",
    discharge_date: "2026-10-13",
    diagnosis: "Severe Right Hip Osteoarthritis s/p Right Total Hip Replacement (THR)",
    medications: [
      { name: "Enoxaparin", dose: "40mg SC", frequency: "Once daily x 14 days" },
      { name: "Paracetamol", dose: "1000mg", frequency: "Thrice daily" },
      { name: "Tramadol", dose: "50mg", frequency: "SOS for severe pain" },
      { name: "Pantoprazole", dose: "40mg", frequency: "Once daily morning" },
    ],
    medical_history: ["Osteoarthritis", "Asthma (mild)"],
    risk_factors: ["Deep vein thrombosis (DVT)", "Post-operative fall hazard"],
    allergies: ["Sulfa drugs"],
    follow_up_plan: "Orthopaedic review on Day 12 for staple removal. Daily walker-assisted physio.",
    raw_history_text: "58yo male underwent elective right uncemented THR. Tolerated procedure well. Mobilizing with walker.",
  },
  {
    id: "p1000000-0000-0000-0000-000000000005",
    department: "Orthopaedics",
    full_name: "Meenakshi Sundaram",
    age: 68,
    sex: "Female",
    patient_phone: "+91-9845012349",
    caregiver_name: "Ganesh M",
    caregiver_relation: "Son",
    caregiver_phone: "+91-9845012350",
    discharge_date: "2026-10-15",
    diagnosis: "Bilateral Knee Osteoarthritis s/p Left Total Knee Replacement (TKR)",
    medications: [
      { name: "Rivaroxaban", dose: "10mg", frequency: "Once daily with food x 12 days" },
      { name: "Aceclofenac + Paracetamol", dose: "100/325mg", frequency: "Twice daily after meals" },
      { name: "Calcium + Vit D3", dose: "500mg/250IU", frequency: "Once daily" },
    ],
    medical_history: ["Hypertension", "Osteopenia"],
    risk_factors: ["DVT risk", "Joint stiffness", "Fall risk"],
    allergies: ["Ibuprofen (gastric upset)"],
    follow_up_plan: "Wound inspection and suture check in Ortho OPD in 14 days.",
    raw_history_text: "68F with debilitating left knee pain underwent successful left TKR. Knee flexion reached 90 degrees at discharge.",
  },
  {
    id: "p1000000-0000-0000-0000-000000000006",
    department: "Orthopaedics",
    full_name: "Amit Patel",
    age: 42,
    sex: "Male",
    patient_phone: "+91-9845012351",
    caregiver_name: "Neha Patel",
    caregiver_relation: "Spouse",
    caregiver_phone: "+91-9845012352",
    discharge_date: "2026-10-16",
    diagnosis: "L4-L5 Lumbar Disc Herniation s/p Microdiscectomy",
    medications: [
      { name: "Pregabalin", dose: "75mg", frequency: "At bedtime" },
      { name: "Paracetamol", dose: "650mg", frequency: "Thrice daily" },
      { name: "Methylprednisolone dose pack", dose: "Tapering", frequency: "As per schedule" },
    ],
    medical_history: ["Lumbar radiculopathy", "Sedentary desk worker"],
    risk_factors: ["Re-herniation risk", "Neuropathic pain flare"],
    allergies: ["NKDA"],
    follow_up_plan: "Spine clinic review in 2 weeks. Strict restriction on forward bending and lifting > 5kg.",
    raw_history_text: "42M presenting with severe left leg sciatica resistant to conservative therapy. Underwent uneventful microdiscectomy.",
  },
  {
    id: "p1000000-0000-0000-0000-000000000007",
    department: "General Surgery",
    full_name: "Fatima Begum",
    age: 49,
    sex: "Female",
    patient_phone: "+91-9845012353",
    caregiver_name: "Mohammed Rafi",
    caregiver_relation: "Brother",
    caregiver_phone: "+91-9845012354",
    discharge_date: "2026-10-14",
    diagnosis: "Symptomatic Cholelithiasis s/p Laparoscopic Cholecystectomy",
    medications: [
      { name: "Cefixime", dose: "200mg", frequency: "Twice daily x 5 days" },
      { name: "Paracetamol", dose: "650mg", frequency: "Every 8 hours as needed" },
      { name: "Pantoprazole", dose: "40mg", frequency: "Once daily before breakfast" },
    ],
    medical_history: ["Recurrent biliary colic", "Mild fatty liver"],
    risk_factors: ["Port-site hematoma", "Bile leak precautions"],
    allergies: ["No known allergies"],
    follow_up_plan: "Surgical OPD in 7 days for port-site dressing review. Low-fat diet for 3 weeks.",
    raw_history_text: "49F admitted with recurrent right upper quadrant pain and gallstones. Laparoscopic cholecystectomy completed without complications.",
  },
  {
    id: "p1000000-0000-0000-0000-000000000008",
    department: "General Surgery",
    full_name: "Sunil Deshmukh",
    age: 54,
    sex: "Male",
    patient_phone: "+91-9845012355",
    caregiver_name: "Asha Deshmukh",
    caregiver_relation: "Spouse",
    caregiver_phone: "+91-9845012356",
    discharge_date: "2026-10-15",
    diagnosis: "Right Inguinal Hernia s/p Lichtenstein Mesh Repair",
    medications: [
      { name: "Amoxicillin-Clavulanate", dose: "625mg", frequency: "Twice daily x 5 days" },
      { name: "Ibuprofen", dose: "400mg", frequency: "Twice daily after food" },
      { name: "Lactulose syrup", dose: "15ml", frequency: "At bedtime (prevent straining)" },
    ],
    medical_history: ["Chronic constipation", "Benign Prostatic Hyperplasia (BPH)"],
    risk_factors: ["Urinary retention", "Seroma / mesh infection risk"],
    allergies: ["NKDA"],
    follow_up_plan: "Review on postoperative Day 8. Avoid strenuous physical labor or heavy lifting for 6 weeks.",
    raw_history_text: "54yo male with reducible right groin swelling. Open mesh hernioplasty performed under spinal anesthesia.",
  },
  {
    id: "p1000000-0000-0000-0000-000000000009",
    department: "Pulmonology",
    full_name: "Joseph George",
    age: 66,
    sex: "Male",
    patient_phone: "+91-9845012357",
    caregiver_name: "Elizabeth George",
    caregiver_relation: "Spouse",
    caregiver_phone: "+91-9845012358",
    discharge_date: "2026-10-14",
    diagnosis: "Acute Exacerbation of Severe Chronic Obstructive Pulmonary Disease (AECOPD, GOLD Stage III)",
    medications: [
      { name: "Budesonide + Formoterol Inhaler", dose: "400/12mcg", frequency: "2 puffs twice daily" },
      { name: "Tiotropium Inhaler", dose: "18mcg", frequency: "1 inhalation once daily" },
      { name: "Tab Prednisolone", dose: "20mg tapering", frequency: "Once daily morning x 7 days" },
      { name: "Tab Azithromycin", dose: "500mg", frequency: "Once daily x 3 days" },
    ],
    medical_history: ["COPD x 10 years (ex-smoker, 35 pack-years)", "Cor Pulmonale (mild)"],
    risk_factors: ["Severe bronchospasm", "Respiratory failure", "Nocturnal hypoxemia"],
    allergies: ["Ciprofloxacin (causes nausea and vomiting)"],
    follow_up_plan: "Pulmonology clinic review in 7 days with Spirometry. Keep home portable SpO2 monitor.",
    raw_history_text: "66M heavy ex-smoker admitted with increased dyspnea, wheezing, and purulent sputum. Stabilized on nebulization and systemic steroids.",
  },
  {
    id: "p1000000-0000-0000-0000-000000000010",
    department: "Pulmonology",
    full_name: "Anita Roy",
    age: 60,
    sex: "Female",
    patient_phone: "+91-9845012359",
    caregiver_name: "Deepak Roy",
    caregiver_relation: "Son",
    caregiver_phone: "+91-9845012360",
    discharge_date: "2026-10-16",
    diagnosis: "Right Lower Lobe Community-Acquired Bacterial Pneumonia with Type 2 Diabetes",
    medications: [
      { name: "Levofloxacin", dose: "750mg", frequency: "Once daily x 5 days" },
      { name: "N-Acetylcysteine effervescent", dose: "600mg", frequency: "Once daily" },
      { name: "Metformin", dose: "500mg", frequency: "Twice daily with meals" },
      { name: "Paracetamol", dose: "650mg", frequency: "SOS for fever > 99.5F" },
    ],
    medical_history: ["Type 2 Diabetes Mellitus", "Hypothyroidism on Levothyroxine 50mcg"],
    risk_factors: ["Delayed resolution in diabetics", "Pleuritic chest pain"],
    allergies: ["NKDA"],
    follow_up_plan: "Chest X-ray and Pulmonology OPD review in 10 days. Ensure oral hydration > 2L/day.",
    raw_history_text: "60F presented with high-grade fever, productive cough with rusty sputum, and right-sided pleuritic chest pain. Chest radiograph confirmed RLL consolidation.",
  },
];

async function seed() {
  console.log("🌱 CareAfter Phase 1 & 2 Seeding starting...\n");

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

  let sunriseUserId: string = "";

  for (const u of USERS) {
    let userId: string;
    const existing = listData?.users?.find((usr) => usr.email === u.email);

    if (existing) {
      userId = existing.id;
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

    if (u.hospital_id === SUNRISE_HOSPITAL_ID) {
      sunriseUserId = userId;
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

  // 3. Upsert Sunrise Departments
  console.log("\n🏢 Upserting Sunrise starter departments...");
  const deptMap = new Map<string, string>();

  for (const name of SUNRISE_DEPARTMENTS) {
    const { data: existing } = await supabase
      .from("departments")
      .select("id")
      .eq("hospital_id", SUNRISE_HOSPITAL_ID)
      .eq("name", name)
      .maybeSingle();

    if (existing) {
      deptMap.set(name, existing.id);
      console.log(`  ⏭  ${name} exists (${existing.id})`);
    } else {
      const { data, error } = await supabase
        .from("departments")
        .insert({
          hospital_id: SUNRISE_HOSPITAL_ID,
          name,
        })
        .select("id")
        .single();

      if (error) throw new Error(`Department insert failed for ${name}: ${error.message}`);
      deptMap.set(name, data.id);
      console.log(`  ✅ Added ${name} (${data.id})`);
    }
  }

  // 4. Upsert 10 Realistic Patients for Sunrise Heart & General
  console.log("\n👨‍⚕️ Upserting 10 seeded patients for Sunrise Hospital...");
  for (const p of PATIENT_DATA) {
    const deptId = deptMap.get(p.department) || null;

    // Check if patient exists
    const { data: existingPatient } = await supabase
      .from("patients")
      .select("id")
      .eq("id", p.id)
      .maybeSingle();

    if (existingPatient) {
      console.log(`  ⏭  Patient ${p.full_name} exists`);
    } else {
      const { error: pError } = await supabase.from("patients").insert({
        id: p.id,
        hospital_id: SUNRISE_HOSPITAL_ID,
        department_id: deptId,
        full_name: p.full_name,
        age: p.age,
        sex: p.sex,
        patient_phone: p.patient_phone,
        caregiver_name: p.caregiver_name,
        caregiver_relation: p.caregiver_relation,
        caregiver_phone: p.caregiver_phone,
        discharge_date: p.discharge_date,
        raw_history_text: p.raw_history_text,
        status: "active",
      });

      if (pError) throw new Error(`Patient insert failed for ${p.full_name}: ${pError.message}`);
      console.log(`  ✅ Inserted patient: ${p.full_name} (${p.department})`);
    }

    // Upsert Patient Record
    const { data: existingRecord } = await supabase
      .from("patient_records")
      .select("id")
      .eq("patient_id", p.id)
      .maybeSingle();

    if (!existingRecord) {
      const { error: rError } = await supabase.from("patient_records").insert({
        patient_id: p.id,
        hospital_id: SUNRISE_HOSPITAL_ID,
        diagnosis: p.diagnosis,
        medications: p.medications,
        medical_history: p.medical_history,
        risk_factors: p.risk_factors,
        allergies: p.allergies,
        follow_up_plan: p.follow_up_plan,
        confirmed_by: sunriseUserId || null,
        confirmed_at: new Date().toISOString(),
      });

      if (rError) throw new Error(`Record insert failed for ${p.full_name}: ${rError.message}`);
    }
  }

  console.log("\n✨ Seed complete!");
  console.log("Credentials:");
  console.log(`  Sunrise Hospital: admin@sunrise.demo / ${DEMO_PASSWORD} (10 Patients across 4 Depts)`);
  console.log(`  Lakeview Medical: admin@lakeview.demo / ${DEMO_PASSWORD} (0 Patients - Isolation Demo)`);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});

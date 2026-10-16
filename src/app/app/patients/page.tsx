import { createClient } from "@/lib/supabase/server";
import { PatientsClient } from "./patients-client";

export default async function PatientsPage() {
  const supabase = await createClient();

  // Fetch all patients for the authenticated hospital tenant
  const { data: patients } = await supabase
    .from("patients")
    .select(`
      id,
      full_name,
      age,
      sex,
      patient_phone,
      discharge_date,
      status,
      department_id,
      departments (
        id,
        name
      ),
      patient_records (
        diagnosis
      )
    `)
    .order("created_at", { ascending: false });

  // Fetch departments for filtering dropdown
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .order("name", { ascending: true });

  const formattedPatients = (patients || []).map((p: any) => ({
    id: p.id,
    full_name: p.full_name,
    age: p.age,
    sex: p.sex,
    patient_phone: p.patient_phone,
    discharge_date: p.discharge_date,
    status: p.status,
    department_id: p.department_id,
    department: p.departments,
    record: Array.isArray(p.patient_records) ? p.patient_records[0] : p.patient_records,
  }));

  return <PatientsClient patients={formattedPatients} departments={departments || []} />;
}

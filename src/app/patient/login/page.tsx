import { redirect } from "next/navigation";
import { getPatientSession } from "@/lib/auth/patient-session";
import { PatientLoginClient } from "./login-client";

export const metadata = {
  title: "Patient Sign In | CareAfter",
  description: "Secure post-discharge patient care portal login",
};

export default async function PatientLoginPage() {
  const session = await getPatientSession();
  if (session?.patientId) {
    redirect("/patient");
  }

  return <PatientLoginClient />;
}

import { redirect } from "next/navigation";
import { getPatientSession } from "@/lib/auth/patient-session";
import { getPatientPortalDataFromSession } from "./actions";
import { PatientClient } from "./patient-client";

export const metadata = {
  title: "CareAfter Recovery Portal",
  description: "Post-discharge patient health monitoring companion",
};

export default async function PatientPortalPage() {
  const session = await getPatientSession();
  if (!session?.patientId) {
    redirect("/patient/login");
  }

  const initialData = await getPatientPortalDataFromSession();
  if (initialData.needLogin) {
    redirect("/patient/login");
  }

  return <PatientClient initialData={initialData} />;
}

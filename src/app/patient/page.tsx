import { PatientClient } from "./patient-client";
import { getPatientPortalData } from "./actions";

export default async function PatientPortalPage(props: {
  searchParams: Promise<{ code?: string }>;
}) {
  const searchParams = await props.searchParams;
  const initialCode = searchParams?.code || "";

  let initialData = null;
  if (initialCode && initialCode.trim().length === 6) {
    const res = await getPatientPortalData(initialCode.trim());
    if (res.success) {
      initialData = res;
    }
  }

  return <PatientClient initialCode={initialCode} initialData={initialData} />;
}

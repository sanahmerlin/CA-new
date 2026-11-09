import { NextResponse } from "next/server";
import { getPatientSession } from "@/lib/auth/patient-session";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST() {
  try {
    const session = await getPatientSession();
    if (!session || !session.patientId) {
      return NextResponse.json({ error: "Unauthorized: patient session required" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const sandboxSubId = `I-SANDBOX-${Date.now()}`;

    const { error: subError } = await supabase.from("subscriptions").upsert(
      {
        patient_id: session.patientId,
        paypal_subscription_id: sandboxSubId,
        plan_id: "P-SANDBOX-CAREPLUS",
        status: "ACTIVE",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "paypal_subscription_id" }
    );

    if (subError) {
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    await supabase.from("patients").update({ plan_tier: "pro" }).eq("id", session.patientId);

    return NextResponse.json({ success: true, status: "ACTIVE", id: sandboxSubId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

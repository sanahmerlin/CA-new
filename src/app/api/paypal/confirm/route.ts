import { NextRequest, NextResponse } from "next/server";
import { getPatientSession } from "@/lib/auth/patient-session";
import { createServiceClient } from "@/lib/supabase/service";

const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";

async function getPayPalAccessToken(clientId: string, clientSecret: string): Promise<string | null> {
  try {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("PayPal OAuth failed:", res.status, errText);
      return null;
    }

    const data = await res.json();
    return data.access_token || null;
  } catch (err) {
    console.error("Error obtaining PayPal access token:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getPatientSession();
    if (!session || !session.patientId) {
      return NextResponse.json({ error: "Unauthorized: patient session required" }, { status: 401 });
    }

    const body = await req.json();
    const { subscriptionId } = body;

    if (!subscriptionId || typeof subscriptionId !== "string") {
      return NextResponse.json({ error: "Missing or invalid subscriptionId" }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "PayPal server credentials not configured" },
        { status: 500 }
      );
    }

    // 1. Authenticate with PayPal Sandbox API
    const accessToken = await getPayPalAccessToken(clientId, clientSecret);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Failed to authenticate with PayPal API" },
        { status: 502 }
      );
    }

    // 2. Fetch Subscription details from PayPal server directly
    const subRes = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!subRes.ok) {
      const errText = await subRes.text();
      console.error("PayPal subscription verification failed:", subRes.status, errText);
      return NextResponse.json(
        { error: "PayPal subscription verification failed", details: errText },
        { status: 400 }
      );
    }

    const subData = await subRes.json();
    const paypalStatus = (subData.status || "").toUpperCase();

    // 3. Only ACTIVE or APPROVED statuses are valid
    if (paypalStatus !== "ACTIVE" && paypalStatus !== "APPROVED") {
      return NextResponse.json(
        { error: `Subscription status '${paypalStatus}' is not active`, status: paypalStatus },
        { status: 400 }
      );
    }

    // 4. Authoritative Upsert into Supabase subscriptions using service role client
    const supabase = createServiceClient();
    const { data: subscriptionRecord, error: subError } = await supabase
      .from("subscriptions")
      .upsert(
        {
          patient_id: session.patientId,
          paypal_subscription_id: subscriptionId,
          plan_id: subData.plan_id || process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID || null,
          status: "ACTIVE",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "paypal_subscription_id" }
      )
      .select()
      .single();

    if (subError) {
      console.error("Database error saving subscription:", subError);
      return NextResponse.json({ error: "Failed to persist subscription in database" }, { status: 500 });
    }

    // Also update patients.plan_tier to 'pro' for cross-system consistency
    await supabase
      .from("patients")
      .update({ plan_tier: "pro" })
      .eq("id", session.patientId);

    return NextResponse.json({
      success: true,
      status: "ACTIVE",
      subscription: subscriptionRecord,
    });
  } catch (err: any) {
    console.error("Unhandled error in /api/paypal/confirm:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

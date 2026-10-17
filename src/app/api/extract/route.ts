import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { extractMedicalHistory } from "@/lib/ai/extractHistory";
import { generatePatientCredentialsFromHistory } from "@/lib/auth/patientCredentials";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createServiceClient(url, serviceKey);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("hospital_id")
      .eq("id", user.id)
      .single();

    if (!profile?.hospital_id) {
      return NextResponse.json({ error: "Hospital profile not found" }, { status: 403 });
    }

    const formData = await req.formData();
    const rawText = (formData.get("rawText") as string) || "";
    const file = formData.get("file") as File | null;
    const fallbackName = (formData.get("fallbackName") as string) || undefined;
    const fallbackAgeStr = formData.get("fallbackAge") as string;
    const fallbackAge = fallbackAgeStr ? parseInt(fallbackAgeStr, 10) : undefined;
    const departmentId = (formData.get("departmentId") as string) || null;
    const dischargeDate = (formData.get("dischargeDate") as string) || new Date().toISOString().split("T")[0];
    const patientPhone = (formData.get("patientPhone") as string) || "+91-9876543210";
    const existingPatientId = (formData.get("patientId") as string) || null;

    let mediaFile: { mimeType: string; base64Data: string } | undefined;

    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      mediaFile = {
        mimeType: file.type || "application/octet-stream",
        base64Data: buffer.toString("base64"),
      };
    }

    if (!rawText.trim() && !mediaFile) {
      return NextResponse.json(
        { error: "Please enter medical notes or attach a file to extract." },
        { status: 400 }
      );
    }

    // Call Gemini extraction
    const result = await extractMedicalHistory({
      rawText: rawText.trim() || undefined,
      mediaFile,
      filename: file?.name,
      fallbackBasics: {
        name: fallbackName,
        age: fallbackAge,
      },
    });

    const finalName =
      result.data.patient_name && result.data.patient_name !== "Discharged Patient"
        ? result.data.patient_name
        : fallbackName || "Discharged Patient";

    const finalAge =
      result.data.patient_age && result.data.patient_age > 0
        ? result.data.patient_age
        : result.data.age && result.data.age > 0 && result.data.age !== 50
        ? result.data.age
        : fallbackAge || 50;

    // 1. Generate credentials directly from extracted history
    const creds = await generatePatientCredentialsFromHistory(finalName, finalAge);

    // 2. Create or update pending patient immediately so phone can log in
    const serviceClient = getServiceClient();
    let patientId = existingPatientId;

    if (patientId) {
      // Update existing pending patient with new credentials and history
      await serviceClient
        .from("patients")
        .update({
          full_name: finalName,
          age: finalAge,
          sex: result.data.sex || "Other",
          username: creds.username,
          password_hash: creds.passwordHash,
          raw_history_text: rawText.trim() || null,
          status: "pending",
        })
        .eq("id", patientId);
    } else {
      // Insert new pending patient record
      const insertPayload = {
        hospital_id: profile.hospital_id,
        department_id: departmentId,
        full_name: finalName,
        age: finalAge,
        sex: result.data.sex || "Other",
        patient_phone: result.data.patient_phone || patientPhone,
        discharge_date: dischargeDate,
        raw_history_text: rawText.trim() || null,
        status: "pending",
        username: creds.username,
        password_hash: creds.passwordHash,
        monitoring_tier: "moderate",
        plan_tier: "free",
        consent_given: true,
      };

      let insertRes = await serviceClient.from("patients").insert(insertPayload).select("id").single();

      // If duplicate key error occurs because migration 005 hasn't been run yet, free the username on older row
      if (insertRes.error && (insertRes.error as any).code === "23505") {
        await serviceClient
          .from("patients")
          .update({ username: `prev_${Date.now()}_${creds.username}` })
          .eq("username", creds.username);

        insertRes = await serviceClient.from("patients").insert(insertPayload).select("id").single();
      }

      if (insertRes.data?.id) {
        patientId = insertRes.data.id;
      }
    }

    return NextResponse.json({
      ...result,
      patientId,
      patientName: finalName,
      patientAge: finalAge,
      credentials: {
        username: creds.username,
        plainPassword: creds.plainPassword,
      },
    });
  } catch (err: any) {
    console.error("API /api/extract error:", err.message);
    return NextResponse.json(
      { error: "An unexpected error occurred during extraction." },
      { status: 500 }
    );
  }
}

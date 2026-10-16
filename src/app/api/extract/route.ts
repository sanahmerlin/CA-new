import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractMedicalHistory } from "@/lib/ai/extractHistory";
import { checkRateLimit } from "@/lib/rateLimit";

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

    // Rate Limiting per hospital
    const rateCheck = checkRateLimit(profile.hospital_id);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many extraction requests. Please wait a minute before analyzing more records." },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const rawText = (formData.get("rawText") as string) || "";
    const file = formData.get("file") as File | null;

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

    // Call Gemini extraction (safely avoids logging full medical text)
    const result = await extractMedicalHistory({
      rawText: rawText.trim() || undefined,
      mediaFile,
      filename: file?.name,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("API /api/extract error:", err.message);
    return NextResponse.json(
      { error: "An unexpected error occurred during extraction." },
      { status: 500 }
    );
  }
}

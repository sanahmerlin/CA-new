import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractMedicalHistory, ExtractedHistory } from "@/lib/ai/extractHistory";
import { checkRateLimit } from "@/lib/rateLimit";

export interface BatchExtractionResult {
  filename: string;
  data: ExtractedHistory;
  error?: string;
  isFallback?: boolean;
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
    const files = formData.getAll("files") as File[];
    const textSnippets = formData.getAll("texts") as string[];

    const totalItems = files.length + textSnippets.length;

    if (totalItems === 0) {
      return NextResponse.json(
        { error: "No files or medical notes provided for batch extraction." },
        { status: 400 }
      );
    }

    if (totalItems > 10) {
      return NextResponse.json(
        { error: "Batch size limit is 10 records at a time to ensure optimal extraction quality." },
        { status: 400 }
      );
    }

    // Rate limit check
    const rateCheck = checkRateLimit(profile.hospital_id, totalItems);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Batch request exceeds current extraction rate limits. Please wait 1 minute before retrying." },
        { status: 429 }
      );
    }

    const results: BatchExtractionResult[] = [];

    // Helper to process with controlled concurrency (up to 3 in parallel to respect API limits)
    const tasks: (() => Promise<BatchExtractionResult>)[] = [];

    // 1. Files
    for (const file of files) {
      tasks.push(async () => {
        try {
          const isText =
            file.type.includes("text") ||
            file.name.endsWith(".txt") ||
            file.name.endsWith(".md");

          if (isText) {
            const textContent = await file.text();
            const res = await extractMedicalHistory({ rawText: textContent });
            return {
              filename: file.name,
              data: res.data,
              error: res.error,
              isFallback: res.isFallback,
            };
          } else {
            const buffer = Buffer.from(await file.arrayBuffer());
            const mediaFile = {
              mimeType: file.type || "application/pdf",
              base64Data: buffer.toString("base64"),
            };
            const res = await extractMedicalHistory({ mediaFile });
            return {
              filename: file.name,
              data: res.data,
              error: res.error,
              isFallback: res.isFallback,
            };
          }
        } catch (err: any) {
          console.warn(`Extraction error for file ${file.name}:`, err.message);
          const fallbackRes = await extractMedicalHistory({ rawText: "" });
          return {
            filename: file.name,
            data: fallbackRes.data,
            error: err.message || "Failed to extract record.",
            isFallback: true,
          };
        }
      });
    }

    // 2. Text Snippets
    for (let i = 0; i < textSnippets.length; i++) {
      const text = textSnippets[i];
      if (!text.trim()) continue;
      tasks.push(async () => {
        try {
          const res = await extractMedicalHistory({ rawText: text });
          return {
            filename: `Clinical Note #${i + 1}`,
            data: res.data,
            error: res.error,
            isFallback: res.isFallback,
          };
        } catch (err: any) {
          const fallbackRes = await extractMedicalHistory({ rawText: "" });
          return {
            filename: `Clinical Note #${i + 1}`,
            data: fallbackRes.data,
            error: err.message,
            isFallback: true,
          };
        }
      });
    }

    // Execute tasks with concurrency pool of 3
    const concurrency = 3;
    let index = 0;

    async function worker() {
      while (index < tasks.length) {
        const currentIndex = index++;
        const itemResult = await tasks[currentIndex]();
        results[currentIndex] = itemResult;
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
    await Promise.all(workers);

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error("API /api/extract/batch error:", err.message);
    return NextResponse.json(
      { error: "An unexpected error occurred during batch extraction." },
      { status: 500 }
    );
  }
}

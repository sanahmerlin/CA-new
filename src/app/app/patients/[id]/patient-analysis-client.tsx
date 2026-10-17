"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, Clock, AlertTriangle, ShieldAlert, Radio } from "lucide-react";

export interface AnalysisResponseItem {
  id: string;
  patient_id: string;
  checkin_id?: string;
  answered_at: string;
  severity: "none" | "watch" | "urgent" | "critical" | string;
  clinical_summary: string | null;
  red_flags_detected?: string[] | null;
}

interface Props {
  patientId: string;
  initialResponses: AnalysisResponseItem[];
}

export function PatientAnalysisClient({ patientId, initialResponses }: Props) {
  const router = useRouter();
  const [responses, setResponses] = useState<AnalysisResponseItem[]>(initialResponses);

  useEffect(() => {
    setResponses(initialResponses);
  }, [initialResponses]);

  useEffect(() => {
    const supabase = createClient();
    const channelName = `realtime-analysis-${patientId}-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "responses",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newRow = payload.new as AnalysisResponseItem;
            setResponses((prev) => {
              const exists = prev.some((r) => r.id === newRow.id);
              if (exists) return prev;
              return [newRow, ...prev];
            });
            router.refresh();
          } else if (payload.eventType === "UPDATE") {
            const updatedRow = payload.new as AnalysisResponseItem;
            setResponses((prev) =>
              prev.map((r) => (r.id === updatedRow.id ? updatedRow : r))
            );
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId, router]);

  // Sort newest first
  const sortedResponses = [...responses].sort(
    (a, b) => new Date(b.answered_at).getTime() - new Date(a.answered_at).getTime()
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-2xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Analysis
            </h3>
            <p className="text-xs text-slate-500">
              AI clinical analysis synthesized from patient check-ins (newest first).
            </p>
          </div>
        </div>

        {/* Live Indicator */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Realtime Updates
          </span>
          <span className="text-xs font-bold text-slate-500">
            {sortedResponses.length} {sortedResponses.length === 1 ? "entry" : "entries"}
          </span>
        </div>
      </div>

      {/* Analysis Stream (Newest First) */}
      {sortedResponses.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
          <Clock className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="text-xs font-bold text-slate-700">No Analysis Recorded Yet</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            The patient has not completed any check-ins yet. When the patient responds on their phone, an overall clinical analysis paragraph will appear here live.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedResponses.map((item, idx) => {
            const sev = (item.severity || "none").toLowerCase();
            const isCritical = sev === "critical";
            const isUrgent = sev === "urgent";
            const isWatch = sev === "watch";

            const containerClass = isCritical
              ? "bg-rose-50/50 border-rose-300"
              : isUrgent
              ? "bg-amber-50/50 border-amber-300"
              : isWatch
              ? "bg-sky-50/50 border-sky-300"
              : "bg-white border-slate-200";

            const chipClass = isCritical
              ? "bg-rose-600 text-white animate-pulse"
              : isUrgent
              ? "bg-amber-600 text-white"
              : isWatch
              ? "bg-sky-600 text-white"
              : "bg-emerald-600 text-white";

            const chipLabel = isCritical
              ? "Critical"
              : isUrgent
              ? "Urgent"
              : isWatch
              ? "Watch"
              : "Routine";

            const formattedTime = new Date(item.answered_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });

            return (
              <div
                key={item.id || idx}
                className={`rounded-2xl border p-5 shadow-xs transition-all space-y-3 ${containerClass}`}
              >
                {/* Meta Row: Timestamp & Severity Status Chip */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-800">{formattedTime}</span>
                    {idx === 0 && (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.2 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                        Latest
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-[11px] font-black uppercase px-3 py-1 rounded-full shadow-2xs ${chipClass}`}
                  >
                    {chipLabel}
                  </span>
                </div>

                {/* Gemini Overall Analysis Paragraph */}
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-slate-900 leading-relaxed font-medium">
                    {item.clinical_summary || "Patient completed check-in. Stable recovery noted."}
                  </p>
                </div>

                {/* Red Flag tags if any */}
                {Array.isArray(item.red_flags_detected) && item.red_flags_detected.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Flagged symptoms:
                    </span>
                    {item.red_flags_detected.map((flag, fIdx) => (
                      <span
                        key={fIdx}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200"
                      >
                        <ShieldAlert className="w-3 h-3 text-rose-600" />
                        {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

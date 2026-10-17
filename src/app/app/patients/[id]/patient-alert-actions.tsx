"use client";

import { useState } from "react";
import { CheckCircle2, Eye, Loader2 } from "lucide-react";
import { acknowledgeAlert, resolveAlert } from "@/app/app/dashboard/actions";
import { useRouter } from "next/navigation";

interface Props {
  alertId: string;
  currentStatus: string;
}

export function PatientAlertActions({ alertId, currentStatus }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAcknowledge = async () => {
    setLoading(true);
    try {
      const res = await acknowledgeAlert(alertId);
      if (res?.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    } catch {
      alert("Failed to acknowledge alert");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    const note = prompt("Enter clinical resolution notes (optional):", "Patient contacted and evaluated by clinical team.");
    if (note === null) return;

    setLoading(true);
    try {
      const res = await resolveAlert(alertId, note);
      if (res?.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    } catch {
      alert("Failed to resolve alert");
    } finally {
      setLoading(false);
    }
  };

  if (currentStatus === "resolved") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        Resolved
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {currentStatus === "open" && (
        <button
          type="button"
          disabled={loading}
          onClick={handleAcknowledge}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3 text-slate-500" />}
          <span>Acknowledge</span>
        </button>
      )}

      <button
        type="button"
        disabled={loading}
        onClick={handleResolve}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
        <span>Mark Resolved</span>
      </button>
    </div>
  );
}

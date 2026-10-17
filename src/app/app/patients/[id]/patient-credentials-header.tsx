"use client";

import { useState } from "react";
import { Copy, Check, RotateCcw, ExternalLink, ShieldCheck, Key, User } from "lucide-react";
import { resetPatientChatAction } from "../actions";

interface Props {
  patientId: string;
  username: string | null;
  fullName: string;
  age: number;
}

export function PatientCredentialsHeader({ patientId, username, fullName, age }: Props) {
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Password formula: lowercase first name + age
  const cleanFirst = fullName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)[0] || "patient";
  const plainPassword = `${cleanFirst}${age}`;

  const handleResetChat = async () => {
    if (!confirm("Reset this patient's monitoring chat? This will clear all responses, check-ins, and alerts, and generate a fresh Day 1 check-in for demonstration.")) {
      return;
    }

    setIsResetting(true);
    setResetSuccess(false);
    try {
      const res = await resetPatientChatAction(patientId);
      if (res.error) {
        alert(res.error);
      } else {
        setResetSuccess(true);
        setTimeout(() => setResetSuccess(false), 3000);
      }
    } catch {
      alert("Failed to reset patient chat.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      {/* Credentials Badge */}
      {username && (
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs shadow-2xs">
          <span className="font-semibold text-slate-600">Patient login:</span>
          <div className="flex items-center gap-1 text-slate-600">
            <span className="font-mono font-bold text-slate-800">{username}</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(username);
                setCopiedUser(true);
                setTimeout(() => setCopiedUser(false), 2000);
              }}
              className="p-1 hover:text-teal-600 text-slate-400 rounded transition"
              title="Copy username"
            >
              {copiedUser ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <span className="text-slate-400 font-bold">/</span>

          <div className="flex items-center gap-1 text-slate-600">
            <span className="font-mono font-bold text-slate-800">{plainPassword}</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(plainPassword);
                setCopiedPass(true);
                setTimeout(() => setCopiedPass(false), 2000);
              }}
              className="p-1 hover:text-teal-600 text-slate-400 rounded transition"
              title="Copy password"
            >
              {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <a
            href="/patient/login"
            target="_blank"
            rel="noreferrer"
            title="Open patient login portal in new tab"
            className="p-1 text-teal-600 hover:text-teal-800 ml-0.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Reset Chat Button */}
      <button
        type="button"
        disabled={isResetting}
        onClick={handleResetChat}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
      >
        <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin text-teal-600" : ""}`} />
        <span>{resetSuccess ? "Chat Reset!" : isResetting ? "Resetting..." : "Reset this patient's chat"}</span>
      </button>
    </div>
  );
}

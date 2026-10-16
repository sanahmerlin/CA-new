"use client";

import { useState } from "react";
import { QrCode, X, Copy, Check, ExternalLink } from "lucide-react";
import { generateQrDataUrl } from "@/lib/qr";

export function PatientQrButton({
  accessCode,
  patientName,
}: {
  accessCode: string;
  patientName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const openModal = async () => {
    const portalUrl = `${window.location.origin}/patient?code=${accessCode}`;
    const url = await generateQrDataUrl(portalUrl);
    setQrUrl(url);
    setIsOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold rounded-lg border border-teal-200 transition-colors"
      >
        <QrCode className="h-3.5 w-3.5 text-teal-700" />
        <span>QR Code & Code: {accessCode}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200 relative">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Patient Recovery Portal
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{patientName}</p>
            </div>

            {qrUrl && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 inline-block">
                <img
                  src={qrUrl}
                  alt="Scan QR"
                  className="w-48 h-48 mx-auto rounded-lg"
                />
                <p className="text-[10px] text-slate-500 mt-1 font-medium">
                  Scan with smartphone camera
                </p>
              </div>
            )}

            <div className="bg-teal-50 border border-teal-200 p-2.5 rounded-xl">
              <span className="text-[10px] font-semibold text-teal-800 uppercase block">
                6-Digit Access Code
              </span>
              <span className="text-2xl font-mono font-bold text-teal-900 tracking-widest">
                {accessCode}
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <a
                href={`/patient?code=${accessCode}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <span>Open Portal (New Tab)</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/patient?code=${accessCode}`
                  );
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="w-full py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Link Copied!" : "Copy Portal Link"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Sparkles, ShieldCheck, Ambulance, Stethoscope, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface CarePlusSubscribeProps {
  onSubscribed?: () => void;
  lang?: "en" | "ml" | "hi";
}

export function CarePlusSubscribe({ onSubscribed, lang = "en" }: CarePlusSubscribeProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";
  const planId = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID || "";

  const handleApprove = async (data: { subscriptionID: string | null }) => {
    if (!data.subscriptionID) {
      setErrorMsg("No subscription ID received from PayPal.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/paypal/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: data.subscriptionID }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to confirm subscription with server.");
      }

      setSuccessMsg("Care+ Activated! Unlocking assistant & priority features...");
      if (onSubscribed) {
        setTimeout(() => {
          onSubscribed();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to activate Care+. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isConfigured = Boolean(
    clientId &&
    planId &&
    !clientId.includes("your-paypal") &&
    !clientId.includes("sb-client-id-demo") &&
    !planId.includes("your-paypal") &&
    !planId.includes("P-DEMO")
  );

  return (
    <div className="bg-gradient-to-br from-teal-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-lg border border-teal-500/30 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 mb-1.5">
            <Sparkles className="h-3 w-3 text-amber-400" />
            <span>Care+ Premium Access</span>
          </div>
          <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
            <span>24/7 AI Doctor & Ambulance Dispatch</span>
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Real-time ambulance proximity search and on-duty doctor contact roster during your recovery.
          </p>
        </div>
        <div className="text-right">
          <span className="text-lg font-black text-amber-400">$9.99</span>
          <span className="text-[10px] text-slate-400 block font-medium">/ month</span>
        </div>
      </div>

      {/* Benefits */}
      <div className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-2 text-xs">
        <div className="flex items-center gap-2 text-slate-200">
          <Ambulance className="h-4 w-4 text-teal-400 shrink-0" />
          <span>Instant nearest ambulance locator with verified driver phone numbers</span>
        </div>
        <div className="flex items-center gap-2 text-slate-200">
          <Stethoscope className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>Real-time on-duty doctor lookups across all clinical specialties</span>
        </div>
        <div className="flex items-center gap-2 text-slate-200">
          <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" />
          <span>Multilingual conversational assistant (English, Malayalam, Hindi)</span>
        </div>
      </div>

      {/* Status Messages */}
      {errorMsg && (
        <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-lg text-xs text-rose-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* PayPal Subscription Buttons */}
      <div className="pt-1">
        {loading ? (
          <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
            <span>Validating subscription with PayPal sandbox...</span>
          </div>
        ) : isConfigured ? (
          <PayPalScriptProvider
            options={{
              clientId: clientId,
              vault: true,
              intent: "subscription",
            }}
          >
            <PayPalButtons
              style={{
                shape: "pill",
                color: "gold",
                layout: "vertical",
                label: "subscribe",
                height: 38,
              }}
              createSubscription={(_data, actions) => {
                return actions.subscription.create({
                  plan_id: planId,
                });
              }}
              onApprove={async (data) => {
                await handleApprove({ subscriptionID: data.subscriptionID ?? null });
              }}
              onError={(err) => {
                console.error("PayPal checkout error:", err);
                setErrorMsg("PayPal checkout encountered an issue. Please try again.");
              }}
            />
          </PayPalScriptProvider>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={async () => {
                // In sandbox development without live credentials, permit simulated upgrade for testing
                setLoading(true);
                try {
                  const res = await fetch("/api/careplus/subscribe-demo", { method: "POST" });
                  const data = await res.json();
                  if (data.success) {
                    setSuccessMsg("Care+ Sandbox Active! Unlocking assistant...");
                    if (onSubscribed) setTimeout(onSubscribed, 1000);
                  } else {
                    setErrorMsg(data.error || "Sandbox activation failed");
                  }
                } catch {
                  setErrorMsg("Sandbox activation failed. Configure PayPal client ID & plan ID.");
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-full shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Activate Care+ (Sandbox Test Mode)</span>
            </button>
            <p className="text-[10px] text-amber-300/80 text-center font-mono">
              Note: Add NEXT_PUBLIC_PAYPAL_CLIENT_ID & NEXT_PUBLIC_PAYPAL_PLAN_ID for live PayPal SDK buttons.
            </p>
          </div>
        )}
      </div>

      {/* Sandbox Disclosure */}
      <div className="pt-1 border-t border-white/10 text-center">
        <p className="text-[10px] text-slate-400">
          Sandbox Demo: No real charges. Use a PayPal developer sandbox test account.
        </p>
      </div>
    </div>
  );
}

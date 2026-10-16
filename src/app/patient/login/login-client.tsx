"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HeartPulse, Lock, User, AlertCircle, ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { loginPatientAction } from "../actions";

export function PatientLoginClient() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || !password.trim()) {
      setError("Please enter your username and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await loginPatientAction(cleanUsername, password.trim());
      if (res.error) {
        setError(res.error);
        setLoading(false);
      } else {
        router.push("/patient");
        router.refresh();
      }
    } catch {
      setError("Unable to connect to care portal. Please check your internet connection.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 via-slate-50 to-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md mx-auto pt-8 sm:pt-14">
        {/* Hospital Branding Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20 mb-3">
            <HeartPulse className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">CareAfter Patient Portal</h1>
          <p className="text-sm text-slate-500 mt-1">Post-discharge monitoring & recovery companion</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Sign in to your care plan</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter the credentials provided on your hospital discharge instructions.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Patient Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="e.g. anitha.menon"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="e.g. anitha62"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo Helper Box */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>Demo hint: <strong className="text-slate-700 font-mono">rajesh.sharma</strong> / <strong className="text-slate-700 font-mono">rajesh62</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto text-center py-6 text-xs text-slate-400">
        <p>In case of acute medical emergencies, immediately dial <strong className="text-slate-600 font-semibold">108</strong>.</p>
        <p className="text-[10px] text-slate-400 mt-1">Demo only. Not a medical device.</p>
      </footer>
    </div>
  );
}

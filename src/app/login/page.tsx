"use client";

import { useActionState, useState } from "react";
import { login } from "./actions";
import { Activity, ShieldCheck, Hospital, ArrowRight, Lock, Mail } from "lucide-react";
import { t } from "@/lib/i18n";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const fillSunrise = () => {
    setEmail("admin@sunrise.demo");
    setPassword("CareAfter2025!");
  };

  const fillLakeview = () => {
    setEmail("admin@lakeview.demo");
    setPassword("CareAfter2025!");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800">
      {/* Top Banner */}
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-sm">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900">CareAfter</span>
              <span className="ml-2 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                Hospital Portal
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            <span>Encrypted Hospital Network</span>
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 mb-4">
                <Hospital className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {t("auth.title")}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {t("auth.subtitle")}
              </p>
            </div>

            {state?.error && (
              <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 font-medium">
                {state.error}
              </div>
            )}

            <form action={formAction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  {t("auth.emailLabel")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="doctor@hospital.org"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  {t("auth.passwordLabel")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
              >
                {isPending ? t("auth.signingIn") : t("auth.signInButton")}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {/* Quick-fill Demo Accounts */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-3">
                {t("auth.demoCredentialsTitle")}
              </span>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={fillSunrise}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-900 group-hover:text-teal-900">
                      Sunrise Heart & General Hospital
                    </div>
                    <div className="text-xs text-slate-500">
                      admin@sunrise.demo • 4 Departments
                    </div>
                  </div>
                  <span className="text-xs font-medium text-teal-600 group-hover:underline">
                    Select
                  </span>
                </button>

                <button
                  type="button"
                  onClick={fillLakeview}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-900 group-hover:text-teal-900">
                      Lakeview Medical
                    </div>
                    <div className="text-xs text-slate-500">
                      admin@lakeview.demo • Empty Isolation Demo
                    </div>
                  </div>
                  <span className="text-xs font-medium text-teal-600 group-hover:underline">
                    Select
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Disclaimer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center">
        <p className="text-xs font-medium text-slate-500">
          {t("common.disclaimer")}
        </p>
      </footer>
    </div>
  );
}

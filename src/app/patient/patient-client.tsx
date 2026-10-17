"use client";

import { useState, useEffect } from "react";
import {
  Volume2,
  Mic,
  MicOff,
  CheckCircle2,
  AlertTriangle,
  PhoneCall,
  Ambulance,
  HeartPulse,
  Globe2,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Calendar,
  Sparkles,
  LogOut,
  Clock,
  Activity,
} from "lucide-react";
import { getPatientPortalDataFromSession, submitPatientCheckinFromSession, logoutPatientAction } from "./actions";

interface Props {
  initialData: any;
}

export function PatientClient({ initialData }: Props) {
  const [lang, setLang] = useState<"en" | "ml" | "hi">("en");
  const [isPending, setIsPending] = useState<boolean>(initialData?.isPending ?? false);
  const [patientData, setPatientData] = useState<any>(initialData?.patient || null);
  const [checkin, setCheckin] = useState<any>(initialData?.checkin || null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Answers State
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [freeText, setFreeText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);

  // ----------------------------------------------------------------------------
  // Realtime Polling: Check every 2 seconds when in PENDING state
  // Automatically switches to questions when doctor confirms enrolment
  // ----------------------------------------------------------------------------
  useEffect(() => {
    if (!isPending) return;

    const interval = setInterval(async () => {
      try {
        const res = await getPatientPortalDataFromSession();
        if (res.success && !res.isPending && res.checkin) {
          setPatientData(res.patient);
          setCheckin(res.checkin);
          setIsPending(false);
        }
      } catch {
        // Silent catch during periodic background poll
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isPending]);

  // Text-To-Speech (Web Speech API)
  const speakText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (lang === "ml") utterance.lang = "ml-IN";
    else if (lang === "hi") utterance.lang = "hi-IN";
    else utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // Speech-To-Text (Microphone)
  const toggleListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please type your answer.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    if (lang === "ml") recognition.lang = "ml-IN";
    else if (lang === "hi") recognition.lang = "hi-IN";
    else recognition.lang = "en-US";

    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setFreeText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setIsListening(false);
    };

    recognition.start();
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!checkin) return;

    setIsSubmitting(true);
    try {
      const res = await submitPatientCheckinFromSession({
        checkinId: checkin.id,
        answers,
        freeText,
        questions: checkin.questions || [],
      });

      if (res.error) {
        alert(res.error);
      } else {
        setResult({
          severity: res.severity,
          adviceToPatient: res.adviceToPatient,
          clinicalSummary: res.clinicalSummary,
          hasCritical: res.severity === "critical",
          hasUrgent: res.severity === "urgent",
          planTier: patientData?.planTier || "free",
        });
      }
    } catch {
      alert("Failed to submit check-in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logoutPatientAction();
  };

  // UI translations
  const UI = {
    dailyCheckin:
      lang === "ml"
        ? "പ്രതിദിന സുഖവിവര പരിശോധന"
        : lang === "hi"
        ? "दैनिक स्वास्थ्य जांच"
        : "Daily Recovery Check-In",
    welcomeBack:
      lang === "ml"
        ? `സ്വാഗതം, ${patientData?.fullName || "രോഗി"}`
        : lang === "hi"
        ? `नमस्ते, ${patientData?.fullName || "मरीज़"}`
        : `Welcome, ${patientData?.fullName || "Patient"}`,
    additionalComments:
      lang === "ml"
        ? "മറ്റ് ലക്ഷണങ്ങൾ / ബുദ്ധിമുട്ടുകൾ:"
        : lang === "hi"
        ? "कोई अन्य लक्षण या असुविधा:"
        : "Any additional symptoms or concerns:",
    speakMic:
      lang === "ml" ? "സംസാരിക്കുക" : lang === "hi" ? "बोलकर बताएं" : "Voice reply",
    listeningPrompt:
      lang === "ml" ? "കേൾക്കുന്നു..." : lang === "hi" ? "सुन रहे हैं..." : "Listening...",
    submitCheckin:
      lang === "ml"
        ? "പരിശോധന സമർപ്പിക്കുക"
        : lang === "hi"
        ? "उत्तर भेजें"
        : "Submit Check-In",
    allNormal:
      lang === "ml"
        ? "നിങ്ങളുടെ മറുപടികൾ സാധാരണമാണ്. നിർദ്ദേശിച്ച മരുന്നുകൾ കൃത്യമായി കഴിക്കുക."
        : lang === "hi"
        ? "आपकी स्थिति सामान्य लग रही है। अपनी दवाएं समय पर लेते रहें।"
        : "Your recovery appears on track. Continue prescribed medications and rest.",
    urgentAdvice:
      lang === "ml"
        ? "ശ്രദ്ധിക്കുക: നിങ്ങളുടെ വിവരങ്ങൾ ഡോക്ടർക്ക് അയച്ചിട്ടുണ്ട്. ആശുപത്രിക്കുമായി ബന്ധപ്പെടുക."
        : lang === "hi"
        ? "सावधानी: आपके लक्षणों के बारे में अस्पताल को सूचित कर दिया गया है।"
        : "Alert: Concerning symptoms flagged. Hospital care team notified.",
    criticalAdvice:
      lang === "ml"
        ? "അടിയന്തര മുന്നറിയിപ്പ്: ദയവായി ഉടൻ 108 ആംബുലൻസിലോ ആശുപത്രിയിലോ വിളിക്കുക!"
        : lang === "hi"
        ? "आपातकालीन चेतावनी: कृपया तुरंत 108 एम्बुलेंस या अस्पताल से संपर्क करें!"
        : "CRITICAL: Please seek immediate emergency medical care or call 108!",
    callAmbulance:
      lang === "ml" ? "108 ആംബുലൻസ്" : lang === "hi" ? "108 एम्बुलेंस" : "Emergency Ambulance",
    callHospital:
      lang === "ml"
        ? "ആശുപത്രി സഹായം"
        : lang === "hi"
        ? "अस्पताल सहायता"
        : "Hospital Helpline",
    doctorHotline:
      lang === "ml"
        ? "ഓൺ-കോൾ ഡോക്ടർ"
        : lang === "hi"
        ? "ऑन-कॉल डॉक्टर"
        : "On-Call Attending Doctor",
    completedTitle:
      lang === "ml"
        ? "പരിശോധന പൂർത്തിയായി"
        : lang === "hi"
        ? "जांच पूर्ण हुई"
        : "Check-In Recorded",
    criticalAlert:
      lang === "ml"
        ? "ഗുരുതരമായ മുന്നറിയിപ്പ്!"
        : lang === "hi"
        ? "गंभीर चेतावनी!"
        : "Critical Health Alert!",
    logout:
      lang === "ml" ? "പുറത്തുകടക്കുക" : lang === "hi" ? "लॉग आउट" : "Log out",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/40 via-slate-50 to-slate-100 flex flex-col justify-between font-sans">
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col bg-white sm:border-x border-slate-200 shadow-xl">
        
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-xs">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xs font-bold text-slate-800 tracking-tight leading-tight">
                {patientData?.hospitalName || "CareAfter"}
              </h1>
              <p className="text-[10px] text-teal-700 font-medium">Post-Discharge Recovery</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  lang === "en" ? "bg-white text-teal-700 shadow-xs" : "text-slate-500"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang("ml")}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  lang === "ml" ? "bg-white text-teal-700 shadow-xs" : "text-slate-500"
                }`}
              >
                മല
              </button>
              <button
                type="button"
                onClick={() => setLang("hi")}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  lang === "hi" ? "bg-white text-teal-700 shadow-xs" : "text-slate-500"
                }`}
              >
                हिं
              </button>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              title="Log out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* ====================================================================== */}
        {/* VIEW 1: PENDING STATE (Waiting for Doctor Confirmation & Enrolment)    */}
        {/* ====================================================================== */}
        {isPending && (
          <div className="flex-1 p-6 flex flex-col justify-center items-center text-center space-y-6">
            {/* Animated Pulser */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-teal-100 animate-ping absolute inset-0 opacity-40" />
              <div className="w-20 h-20 rounded-full bg-teal-600 text-white flex items-center justify-center relative shadow-lg shadow-teal-600/30">
                <Clock className="w-10 h-10 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2 max-w-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <Activity className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                <span>Account Created (Step 1)</span>
              </span>
              <h2 className="text-lg font-bold text-slate-800 pt-1">
                Your hospital is setting up your care plan...
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Welcome, <strong>{patientData?.fullName}</strong>. The clinical team at <strong>{patientData?.hospitalName}</strong> is reviewing your discharge summary and tailoring your recovery check-ins.
              </p>
            </div>

            <div className="w-full bg-slate-50 rounded-xl p-4 border border-slate-200 text-left space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Live Connection Active</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                As soon as your attending doctor clicks <strong>Confirm & Enrol</strong>, your questions will appear right here automatically without needing to refresh this screen.
              </p>
            </div>

            {/* Emergency Hotline reminder */}
            <div className="w-full pt-4 border-t border-slate-100 text-xs text-slate-400">
              <p>Hospital helpline: <a href={`tel:${patientData?.hospitalPhone}`} className="text-teal-700 font-semibold underline">{patientData?.hospitalPhone || "+91-484-2800100"}</a></p>
            </div>
          </div>
        )}

        {/* ====================================================================== */}
        {/* VIEW 2: ACTIVE CHECK-IN (Questions Available)                         */}
        {/* ====================================================================== */}
        {!isPending && !result && checkin && (
          <div className="p-4 space-y-5 flex-1">
            {/* Patient Header Banner */}
            <div className="bg-gradient-to-r from-teal-700 to-teal-900 rounded-2xl p-4 text-white shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  Day {checkin.scheduled_day || 1} Follow-Up
                </span>
                <span className="text-xs font-medium text-teal-200">
                  {patientData?.planTier === "pro" ? "CareAfter Pro VIP" : "CareAfter Free"}
                </span>
              </div>
              <h2 className="text-base font-bold tracking-tight">{UI.welcomeBack}</h2>
              <p className="text-xs text-teal-100 line-clamp-1">{patientData?.diagnosis}</p>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {checkin.questions?.map((q: any, idx: number) => {
                const questionText = q.text?.[lang] || q.text?.en || q.topic;
                const selectedVal = answers[q.id];
                const isConcern =
                  selectedVal &&
                  Array.isArray(q.concern_if) &&
                  q.concern_if.includes(selectedVal);

                return (
                  <div
                    key={q.id || idx}
                    className={`p-4 rounded-xl border transition-all ${
                      isConcern
                        ? "bg-amber-50/70 border-amber-300 shadow-xs"
                        : selectedVal
                        ? "bg-teal-50/40 border-teal-200"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    {/* Question Header & Voice Read Button */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="space-y-0.5 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                          Question {idx + 1}
                        </span>
                        <p className="text-sm font-semibold text-slate-800 leading-snug">
                          {questionText}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => speakText(questionText)}
                        title="Read question aloud"
                        className="text-slate-400 hover:text-teal-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Options (One-tap buttons) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {q.options?.map((opt: any, optIdx: number) => {
                        const optLabel =
                          typeof opt === "string"
                            ? opt
                            : typeof opt?.label === "string"
                            ? opt.label
                            : opt?.label?.[lang] || opt?.label?.en || opt?.text || opt?.value || String(opt);
                        const optVal = typeof opt === "string" ? opt : opt?.value ?? optLabel;
                        const isSelected = selectedVal === optVal;

                        return (
                          <button
                            key={optVal || optIdx}
                            type="button"
                            onClick={() => handleAnswerChange(q.id, optVal)}
                            className={`py-2.5 px-3 rounded-lg text-xs font-medium border text-center transition-all ${
                              isSelected
                                ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {optLabel}
                          </button>
                        );
                      })}
                    </div>

                    {/* Branching Follow-ups (unfolds when concerning answer selected) */}
                    {isConcern && q.follow_ups && q.follow_ups.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-amber-200/80 space-y-3">
                        <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Follow-up Details</span>
                        </p>

                        {q.follow_ups.map((fu: any, fuIdx: number) => {
                          const fuText =
                            typeof fu.text === "string"
                              ? fu.text
                              : fu.text?.[lang] || fu.text?.en || fu.topic || "Follow-up detail";
                          const fuVal = answers[fu.id];

                          return (
                            <div key={fu.id || fuIdx} className="bg-white p-2.5 rounded-lg border border-amber-200">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-xs text-slate-800 font-medium">
                                  {fuText}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => speakText(fuText)}
                                  className="text-amber-700 p-0.5"
                                >
                                  <Volume2 className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <div className="flex items-center gap-2">
                                {fu.options?.map((fopt: any, foptIdx: number) => {
                                  const foptLabel =
                                    typeof fopt === "string"
                                      ? fopt
                                      : typeof fopt?.label === "string"
                                      ? fopt.label
                                      : fopt?.label?.[lang] || fopt?.label?.en || fopt?.text || fopt?.value || String(fopt);
                                  const foptVal = typeof fopt === "string" ? fopt : fopt?.value ?? foptLabel;
                                  const isFuSelected = fuVal === foptVal;

                                  return (
                                    <button
                                      key={foptVal || foptIdx}
                                      type="button"
                                      onClick={() => handleAnswerChange(fu.id, foptVal)}
                                      className={`flex-1 py-1.5 px-2 rounded text-xs font-medium border transition-all ${
                                        isFuSelected
                                          ? "bg-amber-600 text-white border-amber-600"
                                          : "bg-slate-50 text-slate-700 border-slate-200"
                                      }`}
                                    >
                                      {foptLabel}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Free Text & Voice Recognition Input */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  {UI.additionalComments}
                </label>
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    isListening
                      ? "bg-rose-600 text-white animate-pulse"
                      : "bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100"
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="h-3 w-3" />
                      <span>{UI.listeningPrompt}</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-3 w-3" />
                      <span>{UI.speakMic}</span>
                    </>
                  )}
                </button>
              </div>

              <textarea
                rows={2}
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="Type or speak any symptoms or questions..."
                className="w-full text-xs rounded-lg border border-slate-200 p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* Submit Action */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Evaluating responses...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{UI.submitCheckin}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* ====================================================================== */}
        {/* VIEW 3: TRIAGE RESULT & ESCALATION GUIDANCE                           */}
        {/* ====================================================================== */}
        {result && (
          <div className="p-6 space-y-6 flex-1">
            {/* Status Card */}
            <div
              className={`p-5 rounded-2xl border text-center space-y-3 ${
                result.hasCritical
                  ? "bg-rose-50 border-rose-200 text-rose-900"
                  : result.hasUrgent
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-emerald-50 border-emerald-200 text-emerald-900"
              }`}
            >
              <div
                className={`inline-flex p-3 rounded-full ${
                  result.hasCritical
                    ? "bg-rose-100 text-rose-600"
                    : result.hasUrgent
                    ? "bg-amber-100 text-amber-600"
                    : "bg-emerald-100 text-emerald-600"
                }`}
              >
                {result.hasCritical ? (
                  <ShieldAlert className="h-8 w-8" />
                ) : result.hasUrgent ? (
                  <AlertTriangle className="h-8 w-8" />
                ) : (
                  <CheckCircle2 className="h-8 w-8" />
                )}
              </div>

              <div>
                <h3 className="text-base font-bold">
                  {result.hasCritical || result.hasUrgent
                    ? UI.criticalAlert
                    : UI.completedTitle}
                </h3>
                <p className="text-xs mt-1.5 leading-relaxed font-medium">
                  {result.hasCritical
                    ? UI.criticalAdvice
                    : result.hasUrgent
                    ? UI.urgentAdvice
                    : UI.allNormal}
                </p>
              </div>

              {/* Advice Message to Patient */}
              {result.adviceToPatient && (
                <div className="bg-white/90 p-3 rounded-xl text-left border border-black/5 text-xs text-slate-800 space-y-1">
                  <span className="font-semibold text-teal-800 block text-[11px]">Personalized Advice:</span>
                  <p className="leading-relaxed">{result.adviceToPatient}</p>
                </div>
              )}
            </div>

            {/* Emergency & Escalation Numbers */}
            {(result.hasCritical || result.hasUrgent) && (
              <div className="space-y-3">
                {/* 1. Ambulance */}
                <a
                  href="tel:108"
                  className="w-full p-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-between shadow-sm transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Ambulance className="h-5 w-5" />
                    <span>{UI.callAmbulance}</span>
                  </div>
                  <span className="bg-rose-700 px-2.5 py-1 rounded-lg text-[11px]">108</span>
                </a>

                {/* 2. Hospital Helpline */}
                <a
                  href={`tel:${patientData?.hospitalPhone || "+91-484-2800100"}`}
                  className="w-full p-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold text-xs flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <PhoneCall className="h-4 w-4" />
                    <span>{UI.callHospital}</span>
                  </div>
                  <span className="text-slate-300 text-[11px]">{patientData?.hospitalPhone}</span>
                </a>

                {/* 3. Pro Plan: Direct On-Call Doctor Hotline */}
                {result.planTier === "pro" && (
                  <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                        <span>CareAfter Pro VIP Access</span>
                      </span>
                      <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                        PRO
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Your Pro enrollment includes priority access to the on-call attending doctor.
                    </p>
                    <a
                      href="tel:+919840022737"
                      className="inline-flex items-center gap-2 w-full justify-center py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                    >
                      <PhoneCall className="h-3.5 w-3.5" />
                      <span>{UI.doctorHotline} (+91-98400-CARE)</span>
                    </a>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setResult(null);
                setAnswers({});
                setFreeText("");
              }}
              className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-800 font-semibold text-center border rounded-xl hover:bg-slate-50 transition"
            >
              Review or Update Answers
            </button>
          </div>
        )}

        {/* Footer info */}
        <footer className="p-3 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 text-center">
          CareAfter Patient Companion • Demo only. Not a medical device.
        </footer>
      </div>
    </div>
  );
}

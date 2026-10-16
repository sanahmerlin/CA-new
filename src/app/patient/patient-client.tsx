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
} from "lucide-react";
import { getPatientPortalData, submitPatientCheckin } from "./actions";

interface Props {
  initialCode?: string;
  initialData?: any;
}

export function PatientClient({ initialCode = "", initialData = null }: Props) {
  const [lang, setLang] = useState<"en" | "ml" | "hi">("en");
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Portal State
  const [patientData, setPatientData] = useState<any>(initialData?.patient || null);
  const [checkin, setCheckin] = useState<any>(initialData?.checkin || null);

  // Answers State
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [freeText, setFreeText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);

  // Automatically fetch if initial code provided but not yet loaded
  useEffect(() => {
    if (initialCode && initialCode.length === 6 && !patientData) {
      handleLookup(initialCode);
    }
  }, [initialCode]);

  const handleLookup = async (codeToLookup: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPatientPortalData(codeToLookup);
      if (res.error) {
        setError(res.error);
        setPatientData(null);
      } else {
        setPatientData(res.patient);
        setCheckin(res.checkin);
      }
    } catch (e: any) {
      setError(e.message || "Failed to reach server");
    } finally {
      setLoading(false);
    }
  };

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
    recognition.lang = lang === "ml" ? "ml-IN" : lang === "hi" ? "hi-IN" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setFreeText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.start();
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!checkin) return;
    setIsSubmitting(true);
    setError(null);

    const res = await submitPatientCheckin({
      accessCode: code,
      checkinId: checkin.id,
      answers,
      freeText,
      questions: checkin.questions || [],
    });

    setIsSubmitting(false);

    if (res.error) {
      setError(res.error);
    } else {
      setResult(res);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Translations for Portal Interface
  const UI = {
    en: {
      portalTitle: "Post-Discharge Recovery Portal",
      subTitle: "Daily Health Check-in & Recovery Guidance",
      codePrompt: "Enter your 6-digit patient access code from your discharge sheet:",
      codePlaceholder: "e.g. 482913",
      accessBtn: "Access Check-in",
      welcome: "Welcome",
      dayCheckin: "Day Check-in",
      medsHeader: "Prescribed Recovery Medicines:",
      speakQuestion: "Listen",
      additionalComments: "Any additional symptoms or notes for the doctor?",
      listeningPrompt: "Listening... speak now",
      speakMic: "Speak Answer",
      submitCheckin: "Submit Today's Check-in",
      completedTitle: "Check-in Submitted Successfully",
      allNormal: "Your reported vitals and symptoms are normal. Keep resting and taking medications as prescribed.",
      criticalAlert: "Important: Clinical Red Flags Detected",
      criticalAdvice: "Please contact or visit the hospital emergency department immediately.",
      urgentAdvice: "Your symptoms indicate elevated concern. Our care team will review your report shortly.",
      callAmbulance: "Call Ambulance (108)",
      callHospital: "Call Hospital Helpline",
      doctorHotline: "Call On-Call Doctor (Pro Plan)",
      changeCode: "Log out / Change Code",
    },
    ml: {
      portalTitle: "രോഗമുക്തി ആരോഗ്യ പോർട്ടൽ",
      subTitle: "ദിവസേനയുള്ള ആരോഗ്യ പരിശോധനയും നിർദ്ദേശങ്ങളും",
      codePrompt: "നിങ്ങളുടെ ഡിസ്ചാർജ് രേഖയിലെ 6 അക്ക കോഡ് ഇവിടെ നൽകുക:",
      codePlaceholder: "ഉദാഹരണം: 482913",
      accessBtn: "പരിശോധന തുടങ്ങുക",
      welcome: "സ്വാഗതം",
      dayCheckin: "ദിവസത്തെ പരിശോധന",
      medsHeader: "നിർദ്ദേശിച്ച മരുന്നുകൾ:",
      speakQuestion: "കേൾക്കുക",
      additionalComments: "ഡോക്ടറോട് എന്തെങ്കിലും പറയാനുണ്ടോ?",
      listeningPrompt: "ശ്രദ്ധിക്കുന്നു... സംസാരിക്കുക",
      speakMic: "സംസാരിക്കുക",
      submitCheckin: "വിവരങ്ങൾ സമർപ്പിക്കുക",
      completedTitle: "വിവരങ്ങൾ വിജയകരമായി സമർപ്പിച്ചു",
      allNormal: "നിങ്ങളുടെ ആരോഗ്യനില തൃപ്തികരമാണ്. മരുന്നുകൾ കൃത്യമായി കഴിച്ച് വിശ്രമിക്കുക.",
      criticalAlert: "ശ്രദ്ധിക്കുക: അടിയന്തിര ലക്ഷണങ്ങൾ കണ്ടെത്തി",
      criticalAdvice: "ദയവായി ഉടൻ തന്നെ ആശുപത്രി അത്യാഹിത വിഭാഗവുമായി ബന്ധപ്പെടുകയോ സന്ദർശിക്കുകയോ ചെയ്യുക.",
      urgentAdvice: "ലക്ഷണങ്ങൾ അടിയന്തിര ശ്രദ്ധ ആവശ്യപ്പെടുന്നു. ഞങ്ങളുടെ മെഡിക്കൽ സംഘം ഉടൻ പരിശോധിക്കും.",
      callAmbulance: "ആംബുലൻസ് വിളിക്കുക (108)",
      callHospital: "ആശുപത്രിയിലേക്ക് വിളിക്കുക",
      doctorHotline: "ഡോക്ടറുമായി നേരിട്ട് സംസാരിക്കുക (Pro)",
      changeCode: "മറ്റൊരു കോഡ് നൽകുക",
    },
    hi: {
      portalTitle: "डिस्चार्ज रिकवरी पोर्टल",
      subTitle: "दैनिक स्वास्थ्य जांच और रिकवरी मार्गदर्शन",
      codePrompt: "डिस्चार्ज पर्ची पर दिया गया 6 अंकों का कोड दर्ज करें:",
      codePlaceholder: "उदाहरण: 482913",
      accessBtn: "चेक-इन शुरू करें",
      welcome: "स्वागत है",
      dayCheckin: "दिन का चेक-इन",
      medsHeader: "निर्धारित दवाइयां:",
      speakQuestion: "सुनें",
      additionalComments: "क्या डॉक्टर के लिए कोई अन्य लक्षण या टिप्पणी है?",
      listeningPrompt: "सुन रहे हैं... बोलिए",
      speakMic: "बोलकर बताएं",
      submitCheckin: "आज का चेक-इन जमा करें",
      completedTitle: "चेक-इन सफलतापूर्वक पूरा हुआ",
      allNormal: "आपके लक्षण सामान्य हैं। दवाइयां समय पर लें और आराम करें।",
      criticalAlert: "सावधानी: गंभीर लक्षण पाए गए",
      criticalAdvice: "कृपया तुरंत अस्पताल के आपातकालीन विभाग से संपर्क करें या जाएं।",
      urgentAdvice: "आपके लक्षणों पर ध्यान देने की आवश्यकता है। हमारी देखभाल टीम जल्द समीक्षा करेगी।",
      callAmbulance: "एंबुलेंस को कॉल करें (108)",
      callHospital: "अस्पताल हेल्पलाइन पर कॉल करें",
      doctorHotline: "डॉक्टर से सीधे बात करें (Pro)",
      changeCode: "कोड बदलें",
    },
  }[lang];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-3 sm:p-6 text-slate-800">
      {/* Container restricted to mobile width (ideal for smartphones & QR demo) */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden flex flex-col">
        {/* Top Branding & Language Bar */}
        <div className="bg-teal-700 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-6 w-6 text-teal-300" />
            <div>
              <h1 className="text-base font-bold tracking-tight leading-none">
                CareAfter
              </h1>
              <p className="text-[11px] text-teal-200 mt-0.5">
                {UI.portalTitle}
              </p>
            </div>
          </div>

          {/* Multilingual Switcher */}
          <div className="flex items-center gap-1 bg-teal-800/80 p-1 rounded-lg border border-teal-600/50 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-2 py-0.5 rounded transition-all ${
                lang === "en" ? "bg-white text-teal-900 shadow-xs" : "text-teal-200 hover:text-white"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang("ml")}
              className={`px-2 py-0.5 rounded transition-all ${
                lang === "ml" ? "bg-white text-teal-900 shadow-xs" : "text-teal-200 hover:text-white"
              }`}
            >
              മലയാളം
            </button>
            <button
              type="button"
              onClick={() => setLang("hi")}
              className={`px-2 py-0.5 rounded transition-all ${
                lang === "hi" ? "bg-white text-teal-900 shadow-xs" : "text-teal-200 hover:text-white"
              }`}
            >
              हिंदी
            </button>
          </div>
        </div>

        {/* View 1: Enter 6-Digit PIN if not logged in */}
        {!patientData && (
          <div className="p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 bg-teal-50 text-teal-600 rounded-full border border-teal-100 mb-1">
                <Globe2 className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                {UI.subTitle}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                {UI.codePrompt}
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLookup(code);
              }}
              className="space-y-4"
            >
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder={UI.codePlaceholder}
                className="w-full text-center text-2xl tracking-widest font-mono font-bold py-3.5 px-4 rounded-xl border-2 border-slate-300 focus:border-teal-500 focus:outline-none bg-slate-50 focus:bg-white"
              />

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || code.trim().length !== 6}
                className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-semibold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading Patient Record...</span>
                  </>
                ) : (
                  <>
                    <span>{UI.accessBtn}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="text-[11px] text-slate-400 text-center pt-4 border-t border-slate-100">
              Demo Portal • Secure Patient Check-in
            </div>
          </div>
        )}

        {/* View 2: Active Check-in Questionnaire */}
        {patientData && !result && (
          <div className="p-4 sm:p-5 space-y-5">
            {/* Patient Header Banner */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-500 font-medium">
                  {UI.welcome},
                </p>
                <h2 className="text-sm font-bold text-slate-900">
                  {patientData.fullName}
                </h2>
                <p className="text-[10px] text-teal-700 font-medium mt-0.5">
                  {patientData.diagnosis}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  Day {checkin?.scheduled_day || 1}
                </span>
                {patientData.planTier === "pro" && (
                  <span className="block text-[10px] font-bold text-amber-700 mt-1">
                    ★ Pro Plan
                  </span>
                )}
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {checkin?.questions?.map((q: any, idx: number) => {
                const qText = q.text[lang] || q.text.en;
                const isAnswered = Boolean(answers[q.id]);
                const selectedVal = answers[q.id];
                const isConcern = q.concern_if?.includes(selectedVal);

                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isConcern
                        ? "border-amber-300 bg-amber-50/40"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    {/* Question Header & Audio TTS Button */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-start gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-xs font-semibold text-slate-900 leading-snug">
                          {qText}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => speakText(qText)}
                        className="text-teal-600 hover:text-teal-700 p-1 rounded-md hover:bg-teal-50 shrink-0"
                        title={UI.speakQuestion}
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Options (One-tap buttons) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {q.options?.map((opt: any) => {
                        const optLabel = opt.label[lang] || opt.label.en;
                        const isSelected = selectedVal === opt.value;

                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleAnswerChange(q.id, opt.value)}
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

                        {q.follow_ups.map((fu: any) => {
                          const fuText = fu.text[lang] || fu.text.en;
                          const fuVal = answers[fu.id];

                          return (
                            <div key={fu.id} className="bg-white p-2.5 rounded-lg border border-amber-200">
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
                                {fu.options?.map((fopt: any) => {
                                  const foptLabel = fopt.label[lang] || fopt.label.en;
                                  const isFuSelected = fuVal === fopt.value;

                                  return (
                                    <button
                                      key={fopt.value}
                                      type="button"
                                      onClick={() => handleAnswerChange(fu.id, fopt.value)}
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
                placeholder="Type or speak anything unusual..."
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

        {/* View 3: Triage Result & Escalation Guidance */}
        {result && (
          <div className="p-6 space-y-6">
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

              {/* Clinical summary for patient context */}
              {result.clinicalSummary && (
                <div className="bg-white/80 p-3 rounded-xl text-left border border-black/5 text-xs text-slate-700">
                  <span className="font-semibold block mb-0.5">Clinical Note:</span>
                  <span>{result.clinicalSummary}</span>
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
                setPatientData(null);
                setCode("");
              }}
              className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-800 font-semibold text-center border rounded-xl hover:bg-slate-50"
            >
              {UI.changeCode}
            </button>
          </div>
        )}

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 text-center">
          CareAfter Patient Companion • Demo only. Not a medical device.
        </div>
      </div>
    </div>
  );
}

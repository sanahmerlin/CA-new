"use client";

import { useState, useEffect, useRef } from "react";
import {
  Send,
  Sparkles,
  Ambulance,
  Stethoscope,
  PhoneCall,
  Volume2,
  Mic,
  MicOff,
  Navigation,
  MapPin,
  Lock,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { CarePlusSubscribe } from "./CarePlusSubscribe";

interface CarePlusChatProps {
  lang: "en" | "ml" | "hi";
  isSubscribed: boolean;
  onSubscribeSuccess?: () => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  results?: any[];
  isApproxLocation?: boolean;
}

const UI_TEXT = {
  en: {
    title: "Care+ AI Emergency Assistant",
    subtitle: "24/7 Nearest Ambulance & On-Duty Doctor Dispatch",
    quickAmbulance: "🚑 I need an ambulance",
    quickDoctor: "🩺 I need an on-duty doctor",
    inputPlaceholder: "Ask about nearest ambulance or doctors...",
    approxLocation: "Using approximate location (Kochi, Kerala)",
    preciseLocation: "GPS Location Active",
    callDriver: "Call Driver",
    callDoctor: "Call Doctor",
    simulatedBadge: "Demo data (simulated)",
    listening: "Listening...",
    speak: "Speak",
    initialGreeting:
      "Hello! I am your Care+ recovery assistant. How can I assist you? For immediate life-threatening emergencies, always dial 108 first.",
  },
  ml: {
    title: "കെയർ+ AI അടിയന്തര അസിസ്റ്റന്റ്",
    subtitle: "24/7 ഏറ്റവും അടുത്ത ആംബുലൻസും ഡ്യൂട്ടി ഡോക്ടറും",
    quickAmbulance: "🚑 ആംബുലൻസ് വേണം",
    quickDoctor: "🩺 ഡ്യൂട്ടി ഡോക്ടറെ ബന്ധപ്പെടുക",
    inputPlaceholder: "ആംബുലൻസിനെക്കുറിച്ചോ ഡോക്ടറെക്കുറിച്ചോ ചോദിക്കുക...",
    approxLocation: "ഏകദേശ ലൊക്കേഷൻ ഉപയോഗിക്കുന്നു (കൊച്ചി)",
    preciseLocation: "ജി.പി.എസ് ലൊക്കേഷൻ സജീവം",
    callDriver: "ഡ്രൈവറെ വിളിക്കുക",
    callDoctor: "ഡോക്ടറെ വിളിക്കുക",
    simulatedBadge: "ഡെമോ ഡാറ്റ (സിമുലേറ്റഡ്)",
    listening: "കേൾക്കുന്നു...",
    speak: "സംസാരിക്കുക",
    initialGreeting:
      "നമസ്കാരം! ഞാൻ നിങ്ങളുടെ കെയർ+ അസിസ്റ്റന്റാണ്. അടിയന്തര സഹായത്തിന് എപ്പോഴും 108 വിളിക്കുക. ഞാൻ എങ്ങനെയാണ് സഹായിക്കേണ്ടത്?",
  },
  hi: {
    title: "केयर+ AI आपातकालीन सहायक",
    subtitle: "24/7 निकटतम एम्बुलेंस और ऑन-ड्यूटी डॉक्टर",
    quickAmbulance: "🚑 मुझे एम्बुलेंस चाहिए",
    quickDoctor: "🩺 ऑन-ड्यूटी डॉक्टर चाहिए",
    inputPlaceholder: "निकटतम एम्बुलेंस या डॉक्टर के बारे में पूछें...",
    approxLocation: "अनुमानित स्थान का उपयोग (कोच्चि)",
    preciseLocation: "जीपीएस लोकेशन सक्रिय",
    callDriver: "ड्राइवर को कॉल करें",
    callDoctor: "डॉक्टर को कॉल करें",
    simulatedBadge: "डेमो डेटा (सिम्युलेटेड)",
    listening: "सुन रहे हैं...",
    speak: "बोलें",
    initialGreeting:
      "नमस्ते! मैं आपका केयर+ सहायक हूँ। जीवन के खतरे वाली आपात स्थिति में पहले 108 डायल करें। मैं आपकी क्या मदद कर सकता हूँ?",
  },
};

export function CarePlusChat({ lang, isSubscribed, onSubscribeSuccess }: CarePlusChatProps) {
  const t = UI_TEXT[lang] || UI_TEXT.en;

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [usingApprox, setUsingApprox] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init-1",
      sender: "assistant",
      text: t.initialGreeting,
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Update initial greeting on language change
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length <= 1) {
        return [
          {
            id: "init-1",
            sender: "assistant",
            text: t.initialGreeting,
          },
        ];
      }
      return prev;
    });
  }, [lang, t.initialGreeting]);

  // Request browser location on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setUsingApprox(false);
        },
        () => {
          // Fallback to Kochi defaults
          setCoords({ lat: 9.9816, lng: 76.2999 });
          setUsingApprox(true);
        },
        { timeout: 8000 }
      );
    } else {
      setCoords({ lat: 9.9816, lng: 76.2999 });
      setUsingApprox(true);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Text-to-speech for assistant messages
  const speakAssistantText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (lang === "ml") utterance.lang = "ml-IN";
    else if (lang === "hi") utterance.lang = "hi-IN";
    else utterance.lang = "en-US";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  // Speech-to-text voice recognition
  const toggleListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser.");
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

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const sendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    setInputText("");

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/careplus/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          language: lang,
          lat: coords?.lat,
          lng: coords?.lng,
        }),
      });

      const data = await res.json();

      if (data.locked) {
        setMessages((prev) => [
          ...prev,
          {
            id: `asst-${Date.now()}`,
            sender: "assistant",
            text: "Care+ subscription is required to access the dispatch assistant.",
          },
        ]);
        return;
      }

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: "assistant",
        text: data.reply || "I have gathered the contact information below:",
        results: data.results || [],
        isApproxLocation: data.isApproxLocation,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          sender: "assistant",
          text: "Sorry, I encountered an issue retrieving emergency contacts. Please call 108 directly.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // If locked, show subscribe card
  if (!isSubscribed) {
    return (
      <div className="space-y-4">
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold block">Care+ Locked</span>
              <span className="text-[11px] text-amber-800">
                Subscribe to unlock AI-assisted 24/7 nearest ambulance and on-duty doctor dispatch.
              </span>
            </div>
          </div>
        </div>
        <CarePlusSubscribe onSubscribed={onSubscribeSuccess} lang={lang} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-teal-500/30 shadow-md overflow-hidden flex flex-col h-[520px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-800 to-slate-900 text-white p-3.5 flex items-center justify-between border-b border-teal-600/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-500/20 border border-teal-400/30">
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold">{t.title}</h3>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950">
                ACTIVE
              </span>
            </div>
            <p className="text-[10px] text-teal-200">{t.subtitle}</p>
          </div>
        </div>

        {/* GPS status chip */}
        <div className="flex items-center gap-1 text-[10px] text-teal-200 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
          <MapPin className="h-2.5 w-2.5 text-teal-300" />
          <span>{usingApprox ? "Kochi (Approx)" : "GPS Active"}</span>
        </div>
      </div>

      {/* Quick Action Chips */}
      <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center gap-2 overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => sendMessage(t.quickAmbulance)}
          className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white hover:bg-rose-50 text-rose-700 font-semibold border border-rose-200 shadow-2xs transition-colors flex items-center gap-1 text-[11px]"
        >
          <span>{t.quickAmbulance}</span>
        </button>
        <button
          type="button"
          onClick={() => sendMessage(t.quickDoctor)}
          className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white hover:bg-teal-50 text-teal-700 font-semibold border border-teal-200 shadow-2xs transition-colors flex items-center gap-1 text-[11px]"
        >
          <span>{t.quickDoctor}</span>
        </button>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 bg-slate-50/60 text-xs">
        {messages.map((m) => {
          const isUser = m.sender === "user";
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1.5 max-w-[92%] ${
                isUser ? "ml-auto" : "mr-auto"
              }`}
            >
              <div
                className={`p-3 rounded-2xl relative shadow-2xs ${
                  isUser
                    ? "bg-teal-600 text-white rounded-tr-none"
                    : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                }`}
              >
                {!isUser && (
                  <div className="flex items-center justify-between mb-1 pb-1 border-b border-slate-100">
                    <span className="text-[10px] font-bold text-teal-700 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      <span>Care+ Assistant</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => speakAssistantText(m.text)}
                      title="Read aloud"
                      className="text-slate-400 hover:text-teal-600 p-0.5"
                    >
                      <Volume2 className="h-3 w-3" />
                    </button>
                  </div>
                )}

                <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
              </div>

              {/* Render Structured Results Cards (Ambulances & Doctors) */}
              {m.results && m.results.length > 0 && (
                <div className="w-full space-y-2 pt-1">
                  {m.results.map((res: any, idx: number) => {
                    const isAmbulance = res.type === "ambulance";
                    return (
                      <div
                        key={res.id || idx}
                        className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            <div
                              className={`p-2 rounded-lg ${
                                isAmbulance ? "bg-rose-50 text-rose-600" : "bg-teal-50 text-teal-600"
                              }`}
                            >
                              {isAmbulance ? (
                                <Ambulance className="h-4 w-4" />
                              ) : (
                                <Stethoscope className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-xs">{res.name}</h4>
                              <p className="text-[11px] text-slate-500">
                                {isAmbulance
                                  ? `Driver: ${res.driver_name} • ${res.base_area}`
                                  : `${res.specialty} • ${res.hospital}`}
                              </p>
                            </div>
                          </div>

                          {isAmbulance && typeof res.distance_km === "number" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {res.distance_km} km
                            </span>
                          )}
                        </div>

                        {/* Call action and simulated badge */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-[9px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {t.simulatedBadge}
                          </span>
                          <a
                            href={`tel:${res.phone}`}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white shadow-2xs transition-colors ${
                              isAmbulance ? "bg-rose-600 hover:bg-rose-700" : "bg-teal-600 hover:bg-teal-700"
                            }`}
                          >
                            <PhoneCall className="h-3 w-3" />
                            <span>{isAmbulance ? t.callDriver : t.callDoctor} ({res.phone})</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200 text-slate-500 w-fit">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" />
            <span className="text-xs">Finding available ambulances and on-duty doctors...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggleListening}
          className={`p-2 rounded-xl transition-all ${
            isListening ? "bg-rose-600 text-white animate-pulse" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
          title={isListening ? t.listening : t.speak}
        >
          {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          placeholder={t.inputPlaceholder}
          className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />

        <button
          type="button"
          onClick={() => sendMessage()}
          disabled={!inputText.trim() || isLoading}
          className="p-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 text-white rounded-xl shadow-xs transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

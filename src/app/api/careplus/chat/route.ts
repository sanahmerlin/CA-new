import { NextRequest, NextResponse } from "next/server";
import { getPatientSession } from "@/lib/auth/patient-session";
import { isCarePlusActive } from "@/lib/subscriptions/careplus";
import { createServiceClient } from "@/lib/supabase/service";
import { GoogleGenAI } from "@google/genai";

// Default coordinates: Marine Drive, Kochi, Kerala
const DEFAULT_KOCHI_LAT = 9.9816;
const DEFAULT_KOCHI_LNG = 76.2999;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export interface AmbulanceResult {
  type: "ambulance";
  id: string;
  name: string;
  driver_name: string;
  phone: string;
  distance_km: number;
  base_area: string;
}

export interface DoctorResult {
  type: "doctor";
  id: string;
  name: string;
  specialty: string;
  phone: string;
  hospital: string;
}

async function executeFindNearestAmbulances(userLat: number, userLng: number): Promise<AmbulanceResult[]> {
  const supabase = createServiceClient();
  const { data: ambulances, error } = await supabase
    .from("ambulances")
    .select("id, name, driver_name, phone, latitude, longitude, is_available, base_area")
    .eq("is_available", true);

  if (error || !ambulances || ambulances.length === 0) {
    return [];
  }

  const withDistances = ambulances.map((amb) => ({
    type: "ambulance" as const,
    id: amb.id,
    name: amb.name,
    driver_name: amb.driver_name,
    phone: amb.phone,
    distance_km: haversineKm(userLat, userLng, amb.latitude, amb.longitude),
    base_area: amb.base_area,
  }));

  withDistances.sort((a, b) => a.distance_km - b.distance_km);
  return withDistances.slice(0, 3);
}

async function executeGetOnDutyDoctor(specialty?: string): Promise<DoctorResult[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("on_duty_doctors")
    .select("id, name, specialty, phone, is_on_duty, hospital")
    .eq("is_on_duty", true);

  if (specialty && specialty.trim()) {
    query = query.ilike("specialty", `%${specialty.trim()}%`);
  }

  let { data: doctors, error } = await query;

  // Fallback to all on-duty doctors if specific specialty not matched
  if ((!doctors || doctors.length === 0) && specialty) {
    const fallbackRes = await supabase
      .from("on_duty_doctors")
      .select("id, name, specialty, phone, is_on_duty, hospital")
      .eq("is_on_duty", true);
    doctors = fallbackRes.data;
  }

  if (!doctors) return [];

  return doctors.map((doc) => ({
    type: "doctor" as const,
    id: doc.id,
    name: doc.name,
    specialty: doc.specialty,
    phone: doc.phone,
    hospital: doc.hospital,
  }));
}

export async function POST(req: NextRequest) {
  try {
    const session = await getPatientSession();
    if (!session || !session.patientId) {
      return NextResponse.json({ error: "Unauthorized: patient session required" }, { status: 401 });
    }

    // Server-side Care+ subscription check
    const active = await isCarePlusActive(session.patientId);
    if (!active) {
      return NextResponse.json({ locked: true, message: "Care+ subscription required." }, { status: 403 });
    }

    const body = await req.json();
    const { message, language = "en", lat, lng } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const effectiveLat = typeof lat === "number" && !isNaN(lat) ? lat : DEFAULT_KOCHI_LAT;
    const effectiveLng = typeof lng === "number" && !isNaN(lng) ? lng : DEFAULT_KOCHI_LNG;
    const isApproxLocation = typeof lat !== "number" || isNaN(lat);

    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";

    // Define function calling tools for Gemini
    const tools = [
      {
        functionDeclarations: [
          {
            name: "find_nearest_ambulances",
            description: "Find the 3 nearest available emergency ambulances with driver phone numbers and distances in km.",
            parameters: {
              type: "OBJECT",
              properties: {
                lat: { type: "NUMBER", description: "Patient's latitude" },
                lng: { type: "NUMBER", description: "Patient's longitude" },
              },
              required: ["lat", "lng"],
            },
          },
          {
            name: "get_on_duty_doctor",
            description: "Find available on-duty attending doctors and their emergency contact numbers, optionally filtered by medical specialty.",
            parameters: {
              type: "OBJECT",
              properties: {
                specialty: { type: "STRING", description: "Clinical specialty e.g. Cardiology, Surgery, Pulmonology, General" },
              },
            },
          },
        ],
      },
    ];

    const systemInstruction = `You are the CareAfter Care+ priority assistant.
Strict Rules:
1. If the patient describes a life-threatening medical emergency (e.g., severe chest pain, inability to breathe, unconsciousness, heavy uncontrolled bleeding), FIRST tell them clearly to call 108 immediately, and also offer the nearest ambulances or doctors.
2. NEVER diagnose diseases or prescribe medications.
3. Keep answers concise, empathetic, and short (under 3 sentences).
4. Reply in the patient's selected language: ${language === "ml" ? "Malayalam (മലയാളം)" : language === "hi" ? "Hindi (हिंदी)" : "English"}.
5. Always present phone numbers clearly.
6. The patient's current GPS location is Latitude: ${effectiveLat}, Longitude: ${effectiveLng}.`;

    const userPrompt = `Patient query: "${message}". Current coordinates: lat=${effectiveLat}, lng=${effectiveLng}.`;

    // 1. First model call with function calling enabled
    const initialResponse = await client.models.generateContent({
      model: model,
      contents: [{ role: "user", parts: [{ text: userPrompt }] as any }],
      config: {
        systemInstruction,
        tools: tools as any,
        temperature: 0.2,
      },
    });

    const structuredResults: (AmbulanceResult | DoctorResult)[] = [];
    const functionCalls = initialResponse.functionCalls || [];

    // Also check for explicit intent keywords in query as fallback
    const lowerMsg = message.toLowerCase();
    const wantsAmbulance = lowerMsg.includes("ambulance") || lowerMsg.includes("ആംബുലൻസ്") || lowerMsg.includes("एम्बुलेंस");
    const wantsDoctor = lowerMsg.includes("doctor") || lowerMsg.includes("ഡോക്ടർ") || lowerMsg.includes("डॉक्टर") || lowerMsg.includes("specialist");

    // Process function calls
    if (functionCalls.length > 0) {
      const toolParts: any[] = [];

      for (const call of functionCalls) {
        if (call.name === "find_nearest_ambulances") {
          const ambResults = await executeFindNearestAmbulances(effectiveLat, effectiveLng);
          structuredResults.push(...ambResults);
          toolParts.push({
            functionResponse: {
              name: "find_nearest_ambulances",
              response: { ambulances: ambResults },
            },
          });
        } else if (call.name === "get_on_duty_doctor") {
          const specialty = (call.args as any)?.specialty;
          const docResults = await executeGetOnDutyDoctor(specialty);
          structuredResults.push(...docResults);
          toolParts.push({
            functionResponse: {
              name: "get_on_duty_doctor",
              response: { doctors: docResults },
            },
          });
        }
      }

      // 2. Second turn: Provide tool results back to Gemini for natural final answer
      const followUpResponse = await client.models.generateContent({
        model: model,
        contents: [
          { role: "user", parts: [{ text: userPrompt }] as any },
          initialResponse.candidates?.[0]?.content as any,
          { role: "tool", parts: toolParts as any },
        ],
        config: {
          systemInstruction,
          temperature: 0.2,
        },
      });

      const replyText = followUpResponse.text || initialResponse.text || "Here are the contact details you requested.";

      return NextResponse.json({
        locked: false,
        reply: replyText,
        results: structuredResults,
        isApproxLocation,
      });
    }

    // If Gemini chose not to invoke tools, but patient explicitly asked for ambulance or doctor:
    if (wantsAmbulance) {
      const ambResults = await executeFindNearestAmbulances(effectiveLat, effectiveLng);
      structuredResults.push(...ambResults);
    }
    if (wantsDoctor) {
      const docResults = await executeGetOnDutyDoctor();
      structuredResults.push(...docResults);
    }

    const replyText =
      initialResponse.text ||
      (language === "ml"
        ? "നിങ്ങൾ ആവശ്യപ്പെട്ട വിവരങ്ങൾ താഴെ കാർഡുകളിൽ നൽകിയിരിക്കുന്നു."
        : language === "hi"
        ? "आपके अनुरोध के अनुसार विवरण नीचे दिए गए हैं।"
        : "Here are the emergency contacts and options available for you.");

    return NextResponse.json({
      locked: false,
      reply: replyText,
      results: structuredResults,
      isApproxLocation,
    });
  } catch (err: any) {
    console.error("Care+ Assistant API error:", err);
    return NextResponse.json(
      {
        error: "Failed to process Care+ assistant request.",
        details: err.message,
      },
      { status: 500 }
    );
  }
}

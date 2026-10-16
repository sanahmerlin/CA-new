import { GoogleGenAI } from "@google/genai";

if (typeof window !== "undefined") {
  throw new Error("Gemini API calls can only be executed on the server.");
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not defined in environment variables.");
  }
  return new GoogleGenAI({ apiKey: apiKey || "" });
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || "gemini-3.5-flash";
}

export interface InlineMediaPart {
  inlineData: {
    mimeType: string;
    data: string; // base64
  };
}

export async function generateGeminiContent(options: {
  contents: (string | InlineMediaPart)[];
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: Record<string, any>;
}): Promise<string> {
  const primaryModel = getGeminiModel();
  const fallbackModel = "gemini-3.5-flash-lite";

  const client = getAiClient();

  try {
    const response = await client.models.generateContent({
      model: primaryModel,
      contents: options.contents as any,
      config: {
        systemInstruction: options.systemInstruction,
        responseMimeType: options.responseMimeType,
        responseSchema: options.responseSchema,
        temperature: 0.1, // Low temperature for factual clinical extraction
      },
    });

    return response.text || "";
  } catch (err: any) {
    // If primary model experienced 503 spike or error, retry once with fallback
    console.warn(`Primary Gemini model (${primaryModel}) error: ${err.message}. Retrying with ${fallbackModel}...`);
    const fallbackResponse = await client.models.generateContent({
      model: fallbackModel,
      contents: options.contents as any,
      config: {
        systemInstruction: options.systemInstruction,
        responseMimeType: options.responseMimeType,
        responseSchema: options.responseSchema,
        temperature: 0.1,
      },
    });

    return fallbackResponse.text || "";
  }
}

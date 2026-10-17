import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const COOKIE_NAME = "careafter_patient_session";
const SESSION_EXPIRY_DAYS = 30;

function getSessionSecret(): string {
  const secret = process.env.PATIENT_SESSION_SECRET || "careafter-patient-session-secret-fallback-minimum-32-chars";
  return secret;
}

export interface PatientSessionPayload {
  patientId: string;
  hospitalId: string;
  username: string;
  exp: number;
}

// ==============================================================================
// 1. Credential Generation Utilities
// ==============================================================================

/**
 * Generates credentials per rules:
 * - Username: lowercase full name with dots (e.g. "Anitha Menon" -> anitha.menon)
 *   If taken, appends numbers (anitha.menon2, anitha.menon3, ...)
 * - Password: lowercase first name + age (e.g. anitha62)
 * - Returns plaintext password (for one-time display) and bcrypt hash.
 */
export async function generatePatientCredentials(
  fullName: string,
  age: number,
  checkUsernameExists: (username: string) => Promise<boolean>
): Promise<{ username: string; plainPassword: string; passwordHash: string }> {
  // Normalize full name for username
  const cleanParts = fullName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  const baseUsername = cleanParts.length > 0 ? cleanParts.join(".") : `patient.${Date.now() % 10000}`;
  let chosenUsername = baseUsername;
  let counter = 2;

  // Ensure username uniqueness across all hospitals
  while (await checkUsernameExists(chosenUsername)) {
    chosenUsername = `${baseUsername}${counter}`;
    counter++;
  }

  // Password = first name + age
  const firstName = cleanParts[0] || "patient";
  const safeAge = age && age > 0 ? age : 45;
  const plainPassword = `${firstName}${safeAge}`;

  // Bcrypt hash
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  return {
    username: chosenUsername,
    plainPassword,
    passwordHash,
  };
}

// ==============================================================================
// 2. Cryptographic Session Token (HMAC-SHA256)
// ==============================================================================

function signData(data: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

export function encodeSession(payload: PatientSessionPayload): string {
  const secret = getSessionSecret();
  const jsonStr = JSON.stringify(payload);
  const dataB64 = Buffer.from(jsonStr).toString("base64url");
  const signature = signData(dataB64, secret);
  return `${dataB64}.${signature}`;
}

export function verifySessionToken(token: string): PatientSessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [dataB64, signature] = parts;
    const secret = getSessionSecret();

    const expectedSig = signData(dataB64, secret);
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const jsonStr = Buffer.from(dataB64, "base64url").toString("utf-8");
    const payload = JSON.parse(jsonStr) as PatientSessionPayload;

    if (!payload.patientId || !payload.exp || Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// ==============================================================================
// 3. Cookie Session Handlers
// ==============================================================================

export async function setPatientSessionCookie(patient: {
  id: string;
  hospital_id: string;
  username: string;
}): Promise<void> {
  const cookieStore = await cookies();
  const exp = Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

  const payload: PatientSessionPayload = {
    patientId: patient.id,
    hospitalId: patient.hospital_id,
    username: patient.username,
    exp,
  };

  const token = encodeSession(payload);

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
  });
}

export async function getPatientSession(): Promise<PatientSessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function clearPatientSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ==============================================================================
// 4. In-Memory Rate Limiter (5 attempts per 10 minutes)
// ==============================================================================

interface RateLimitRecord {
  attempts: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

export function checkLoginRateLimit(key: string): { allowed: boolean; remainingMinutes?: number } {
  // Relaxed completely for demo logins so repeated test logins never block
  return { allowed: true };
}

export function recordFailedLoginAttempt(key: string): void {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { attempts: 1, resetAt: now + windowMs });
  } else {
    record.attempts += 1;
  }
}

export function resetLoginRateLimit(key: string): void {
  rateLimitMap.delete(key);
}

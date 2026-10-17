import bcrypt from "bcryptjs";

export interface GeneratedCredentials {
  username: string;
  plainPassword: string;
  passwordHash: string;
}

/**
 * Generates patient credentials directly from patient name and age:
 * - Username: lowercase first name + "." + lowercase last name (e.g. "Anitha Menon" -> anitha.menon)
 *   If there is only one name, use just that name. Remove spaces and special characters.
 * - Password: lowercase first name + age (e.g. "anitha62").
 * - Returns username, plainPassword, and bcrypt passwordHash.
 */
export async function generatePatientCredentialsFromHistory(
  fullName: string,
  age: number
): Promise<GeneratedCredentials> {
  // Clean and split name into words, stripping any special characters
  const cleanParts = (fullName || "patient")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  const firstName = cleanParts[0] || "patient";
  const lastName = cleanParts.length > 1 ? cleanParts[cleanParts.length - 1] : "";

  const username = lastName ? `${firstName}.${lastName}` : firstName;

  const safeAge = age && age > 0 ? Math.round(age) : 45;
  const plainPassword = `${firstName}${safeAge}`;

  const passwordHash = await bcrypt.hash(plainPassword, 10);

  return {
    username,
    plainPassword,
    passwordHash,
  };
}

// Alias for general use across the codebase
export const generatePatientCredentials = generatePatientCredentialsFromHistory;

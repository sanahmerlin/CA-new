/**
 * Red Flags Safety Engine for CareAfter.
 * Deterministic keyword and pattern matching over patient answers and free-text replies.
 * Life-threatening clinical conditions strictly force severity to "critical".
 */

export type Severity = "none" | "watch" | "urgent" | "critical";

const SEVERITY_LEVELS: Record<Severity, number> = {
  none: 0,
  watch: 1,
  urgent: 2,
  critical: 3,
};

// Patterns that immediately force CRITICAL severity
export const CRITICAL_PATTERNS: { regex: RegExp; label: string }[] = [
  {
    regex: /(chest\s*pain|chest\s*pressure|crushing\s*chest|heavy\s*chest|angina|pain\s*radiating\s*to\s*(arm|jaw|neck|back))/i,
    label: "Acute Coronary / Chest Pain Syndrome",
  },
  {
    regex: /(cannot\s*breathe|can't\s*breathe|severe\s*breathless|gasping|suffocating|struggling\s*for\s*air|blue\s*(lips|fingers)|cyanosis)/i,
    label: "Severe Respiratory Distress",
  },
  {
    regex: /(fainted|fainting|blacked\s*out|passed\s*out|loss\s*of\s*consciousness|unresponsive|collapsed)/i,
    label: "Syncope / Sudden Unresponsiveness",
  },
  {
    regex: /(cough(ing)?\s*(up\s*)?blood|hemoptysis|vomit(ing)?\s*blood|hematemesis)/i,
    label: "Internal Hemorrhage / Hemoptysis",
  },
  {
    regex: /(face\s*(droop|paralysis)|slurred\s*speech|cannot\s*speak|arm\s*weakness|sudden\s*numbness|stroke)/i,
    label: "Acute Cerebrovascular / Stroke Symptoms (FAST)",
  },
  {
    regex: /(severe\s*bleed(ing)?|uncontrolled\s*bleed(ing)?|wound\s*burst|wound\s*opened|gushing\s*blood)/i,
    label: "Severe Bleeding / Surgical Dehiscence",
  },
  {
    regex: /(stiff\s*neck\s*with\s*fever|fever\s*(above\s*103|>103|>39\.5)|septic|confusion\s*with\s*fever)/i,
    label: "Sepsis / Neurological Infection Risk",
  },
];

// Patterns that trigger URGENT severity
export const URGENT_PATTERNS: { regex: RegExp; label: string }[] = [
  {
    regex: /(calf\s*(pain|swelling|redness)|leg\s*swelling\s*and\s*warm|dvt)/i,
    label: "Suspected Deep Vein Thrombosis (DVT)",
  },
  {
    regex: /(pus\s*from\s*wound|wound\s*red\s*and\s*warm|fever\s*(above\s*101|>101|>38\.3))/i,
    label: "Surgical Site Infection / Elevated Fever",
  },
  {
    regex: /(rapid\s*weight\s*gain|weight\s*up\s*(2|3|4|5)\s*(kg|lbs)|severe\s*orthopnea)/i,
    label: "Decompensating Fluid Overload",
  },
  {
    regex: /(cannot\s*keep\s*(food|water|fluid)\s*down|persistent\s*vomiting)/i,
    label: "Severe Dehydration Risk",
  },
];

export interface RedFlagScanResult {
  hasCritical: boolean;
  hasUrgent: boolean;
  matchedFlags: string[];
  suggestedSeverity: Severity;
}

/**
 * Scans text or answer arrays for deterministic red flag symptoms
 */
export function scanForRedFlags(input: string | string[]): RedFlagScanResult {
  const combined = Array.isArray(input) ? input.join(" ") : input;
  const matchedFlags: string[] = [];

  let hasCritical = false;
  let hasUrgent = false;

  for (const { regex, label } of CRITICAL_PATTERNS) {
    if (regex.test(combined)) {
      hasCritical = true;
      matchedFlags.push(`[CRITICAL] ${label}`);
    }
  }

  for (const { regex, label } of URGENT_PATTERNS) {
    if (regex.test(combined)) {
      hasUrgent = true;
      matchedFlags.push(`[URGENT] ${label}`);
    }
  }

  const suggestedSeverity: Severity = hasCritical
    ? "critical"
    : hasUrgent
    ? "urgent"
    : "none";

  return {
    hasCritical,
    hasUrgent,
    matchedFlags,
    suggestedSeverity,
  };
}

/**
 * Calculates final severity using MAX rule across all evaluation layers:
 * Rule (from question concern_if)
 * Red Flag (deterministic keyword matcher)
 * Gemini (clinical language model)
 *
 * CRITICAL RULE: Gemini may raise severity, but can NEVER lower a red flag or rule result!
 */
export function calculateFinalSeverity(
  ruleSeverity: Severity = "none",
  redFlagSeverity: Severity = "none",
  geminiSeverity: Severity = "none"
): Severity {
  const values = [
    SEVERITY_LEVELS[ruleSeverity] || 0,
    SEVERITY_LEVELS[redFlagSeverity] || 0,
    SEVERITY_LEVELS[geminiSeverity] || 0,
  ];

  const maxVal = Math.max(...values);

  for (const [key, val] of Object.entries(SEVERITY_LEVELS)) {
    if (val === maxVal) {
      return key as Severity;
    }
  }

  return "none";
}

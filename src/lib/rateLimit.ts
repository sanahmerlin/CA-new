/**
 * In-memory sliding-window rate limiter for AI extraction requests.
 * Limits extraction attempts per hospital/IP to avoid API quota exhaustion.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitRecord>();

const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 extraction calls per minute

export function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key) || { timestamps: [] };

  // Filter timestamps within the current window
  const activeTimestamps = record.timestamps.filter((ts) => now - ts < WINDOW_MS);

  if (activeTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      remaining: 0,
    };
  }

  activeTimestamps.push(now);
  rateLimitMap.set(key, { timestamps: activeTimestamps });

  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - activeTimestamps.length,
  };
}

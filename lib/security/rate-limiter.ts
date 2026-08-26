import { NextRequest, NextResponse } from "next/server";

export type RateLimitCategory =
  | "general"
  | "auth"
  | "registration"
  | "payment"
  | "email"
  | "qr_scan"
  | "public_read";

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  resetInSeconds: number;
  totalLimit: number;
  category: RateLimitCategory;
}

// ── CONFIGURATION & ENVIRONMENT OVERRIDES ──
function getCategoryConfig(category: RateLimitCategory): RateLimitConfig {
  const isEnabled = process.env.RATE_LIMIT_ENABLED !== "false";
  if (!isEnabled) {
    return { maxRequests: 100_000, windowSeconds: 60 };
  }

  switch (category) {
    case "auth":
      return {
        maxRequests: parseInt(process.env.RATE_LIMIT_AUTH_REQUESTS || "5", 10),
        windowSeconds: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_SECONDS || "600", 10), // 5 per 10 mins
      };
    case "registration":
      return {
        maxRequests: parseInt(process.env.RATE_LIMIT_REGISTRATION_REQUESTS || "10", 10),
        windowSeconds: parseInt(process.env.RATE_LIMIT_REGISTRATION_WINDOW_SECONDS || "600", 10), // 10 per 10 mins
      };
    case "payment":
      return {
        maxRequests: parseInt(process.env.RATE_LIMIT_PAYMENT_REQUESTS || "5", 10),
        windowSeconds: parseInt(process.env.RATE_LIMIT_PAYMENT_WINDOW_SECONDS || "600", 10), // 5 per 10 mins
      };
    case "email":
      return {
        maxRequests: parseInt(process.env.RATE_LIMIT_EMAIL_REQUESTS || "10", 10),
        windowSeconds: parseInt(process.env.RATE_LIMIT_EMAIL_WINDOW_SECONDS || "3600", 10), // 10 per hour
      };
    case "qr_scan":
      return {
        maxRequests: parseInt(process.env.RATE_LIMIT_SCAN_REQUESTS || "120", 10),
        windowSeconds: parseInt(process.env.RATE_LIMIT_SCAN_WINDOW_SECONDS || "60", 10), // 120 per min (supports 10-20 concurrent volunteers)
      };
    case "public_read":
      return {
        maxRequests: parseInt(process.env.RATE_LIMIT_PUBLIC_READ_REQUESTS || "120", 10),
        windowSeconds: parseInt(process.env.RATE_LIMIT_PUBLIC_READ_WINDOW_SECONDS || "60", 10), // 120 per min
      };
    case "general":
    default:
      return {
        maxRequests: parseInt(process.env.RATE_LIMIT_GENERAL_REQUESTS || "100", 10),
        windowSeconds: parseInt(process.env.RATE_LIMIT_GENERAL_WINDOW_SECONDS || "60", 10), // 100 per min
      };
  }
}

// ── IN-MEMORY SLIDING WINDOW STORE (MULTI-INSTANCE FAST TIER & FAIL-SAFE) ──
interface RateLimitEntry {
  timestamps: number[];
}

const memoryStore = new Map<string, RateLimitEntry>();

// Evict expired entries every 3 minutes to guarantee zero memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      // Find max window (1 hour max for email)
      const validTimestamps = entry.timestamps.filter((ts) => now - ts < 3600 * 1000);
      if (validTimestamps.length === 0) {
        memoryStore.delete(key);
      } else {
        entry.timestamps = validTimestamps;
      }
    }
  }, 3 * 60 * 1000).unref?.();
}

/**
 * Extracts client IP safely from NextRequest headers.
 */
export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ip = forwardedFor.split(",")[0].trim();
    if (ip) return ip;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  return "127.0.0.1";
}

/**
 * Checks and records a rate limit hit for a given identifier and category.
 * Uses atomic sliding window algorithm.
 */
export async function checkRateLimit(
  identifier: string,
  category: RateLimitCategory = "general"
): Promise<RateLimitResult> {
  const config = getCategoryConfig(category);
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = `${category}:${identifier}`;

  let entry = memoryStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    memoryStore.set(key, entry);
  }

  // Filter timestamps within the current sliding window
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);

  const count = entry.timestamps.length;
  if (count >= config.maxRequests) {
    const oldest = entry.timestamps[0] || now;
    const resetInSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));

    return {
      limited: true,
      remaining: 0,
      resetInSeconds,
      totalLimit: config.maxRequests,
      category,
    };
  }

  // Record current request timestamp
  entry.timestamps.push(now);
  const remaining = config.maxRequests - (count + 1);
  const resetInSeconds = config.windowSeconds;

  return {
    limited: false,
    remaining,
    resetInSeconds,
    totalLimit: config.maxRequests,
    category,
  };
}

/**
 * Generates a standardized HTTP 429 Too Many Requests response with safe headers.
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  customMessage?: string
): NextResponse {
  const message =
    customMessage ||
    `Too many requests. Please wait ${result.resetInSeconds} seconds before trying again.`;

  return NextResponse.json(
    {
      error: "RATE_LIMITED",
      message,
      retryAfter: result.resetInSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.resetInSeconds),
        "X-RateLimit-Limit": String(result.totalLimit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(Date.now() / 1000) + result.resetInSeconds),
      },
    }
  );
}

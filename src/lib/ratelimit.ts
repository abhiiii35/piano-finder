import { headers } from "next/headers";
import { boundedSet } from "@/lib/bounded-map";

// In-memory fixed-window rate limiter — single Next.js instance only.
// ponytail: process-local Map, resets on redeploy and doesn't share state
// across instances; move to @upstash/ratelimit + Redis if this ever runs
// multi-instance.
const buckets = new Map<string, { count: number; resetAt: number }>();

// Cap the number of tracked keys so an attacker rotating identifiers can't
// grow this Map without bound; oldest entries are evicted first.
const MAX_BUCKETS = 50_000;

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
}

/** Fixed-window limiter: `limit` calls per `windowMs` per `key`. */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    boundedSet(buckets, key, { count: 1, resetAt: now + windowMs }, MAX_BUCKETS);
    return { ok: true, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

/** Best-effort client IP from the standard proxy header; falls back to a shared bucket. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

/** Test-only: clears all buckets so unit tests calling a limited action many
 * times in one file don't trip each other's limits (tests share one process,
 * unlike production requests). Not called from app code. */
export function resetRateLimits(): void {
  buckets.clear();
}

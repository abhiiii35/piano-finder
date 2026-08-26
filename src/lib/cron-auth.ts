import { timingSafeEqual } from "crypto";

/** Constant-time secret comparison, shared by every cron route's auth check. */
export function secretsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual throws on length mismatch rather than returning false —
  // that's fine here since the lengths themselves aren't secret.
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

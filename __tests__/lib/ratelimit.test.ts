import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit, getClientIp, resetRateLimits } from "@/lib/ratelimit";

describe("rateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows calls up to the limit", () => {
    const key = "test-allow";
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 1000).ok).toBe(true);
    }
  });

  it("blocks the call once the limit is exceeded, with a retryAfterSec", () => {
    const key = "test-block";
    rateLimit(key, 2, 1000);
    rateLimit(key, 2, 1000);
    const blocked = rateLimit(key, 2, 1000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets after the window elapses", () => {
    const key = "test-window";
    rateLimit(key, 1, 1000);
    expect(rateLimit(key, 1, 1000).ok).toBe(false);

    vi.advanceTimersByTime(1001);

    expect(rateLimit(key, 1, 1000).ok).toBe(true);
  });

  it("tracks separate keys independently", () => {
    rateLimit("key-a", 1, 1000);
    expect(rateLimit("key-a", 1, 1000).ok).toBe(false);
    expect(rateLimit("key-b", 1, 1000).ok).toBe(true);
  });

  it("evicts the oldest bucket once the tracked-key cap is exceeded", () => {
    // MAX_BUCKETS is 50_000 and not configurable — fill past it with distinct
    // keys and confirm the very first key was evicted (still functions, just
    // starts a fresh window) rather than the Map growing unbounded.
    for (let i = 0; i < 50_001; i++) {
      rateLimit(`bucket-${i}`, 1, 60_000);
    }
    // bucket-0 was evicted, so a fresh call for it is allowed again even
    // though its original window (60s) hasn't elapsed.
    expect(rateLimit("bucket-0", 1, 60_000).ok).toBe(true);
  });
});

describe("getClientIp", () => {
  afterEach(() => {
    vi.doUnmock("next/headers");
    vi.resetModules();
  });

  it("falls back to 'unknown' when x-forwarded-for is absent (default test mock)", async () => {
    const ip = await getClientIp();
    expect(ip).toBe("unknown");
  });

  it("reads the first IP from a comma-separated x-forwarded-for header", async () => {
    vi.doMock("next/headers", () => ({
      headers: vi.fn(() =>
        Promise.resolve({
          get: (key: string) =>
            key === "x-forwarded-for" ? "203.0.113.5, 10.0.0.1" : null,
        })
      ),
    }));
    vi.resetModules();
    const { getClientIp: freshGetClientIp } = await import("@/lib/ratelimit");
    const ip = await freshGetClientIp();
    expect(ip).toBe("203.0.113.5");
  });
});

/**
 * Standalone boundary check for the 2026-08-26 security audit fixes.
 * No server/DB required — exercises the helper functions directly.
 * Run: npx tsx scripts/security-check.ts
 */
import assert from "node:assert/strict";
import { rateLimit, resetRateLimits } from "../src/lib/ratelimit";
import { boundedSet } from "../src/lib/bounded-map";
import { secretsMatch } from "../src/lib/cron-auth";
import { geocode } from "../src/lib/geocoding";

let failures = 0;

function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`  ok  - ${name}`))
    .catch((err) => {
      failures++;
      console.error(`FAIL  - ${name}`);
      console.error(err);
    });
}

async function main() {
  console.log("rateLimit()");
  await check("allows calls under the limit", () => {
    resetRateLimits();
    for (let i = 0; i < 3; i++) assert.equal(rateLimit("k1", 3, 1000).ok, true);
  });
  await check("blocks the call once the limit is hit, with retryAfterSec > 0", () => {
    resetRateLimits();
    rateLimit("k2", 2, 1000);
    rateLimit("k2", 2, 1000);
    const blocked = rateLimit("k2", 2, 1000);
    assert.equal(blocked.ok, false);
    assert.ok(blocked.retryAfterSec > 0);
  });
  await check("different keys don't share a bucket", () => {
    resetRateLimits();
    rateLimit("k3", 1, 1000);
    assert.equal(rateLimit("k3", 1, 1000).ok, false);
    assert.equal(rateLimit("k4", 1, 1000).ok, true);
  });

  console.log("boundedSet()");
  await check("evicts the oldest entry once at capacity", () => {
    const m = new Map<string, number>();
    boundedSet(m, "a", 1, 2);
    boundedSet(m, "b", 2, 2);
    boundedSet(m, "c", 3, 2);
    assert.equal(m.size, 2);
    assert.equal(m.has("a"), false);
    assert.equal(m.get("c"), 3);
  });

  console.log("secretsMatch() — CRON_SECRET comparison");
  await check("matching secrets return true", () => {
    assert.equal(secretsMatch("abc123", "abc123"), true);
  });
  await check("wrong secret returns false", () => {
    assert.equal(secretsMatch("abc123", "wrong!"), false);
  });
  await check("different-length secrets return false without throwing", () => {
    assert.equal(secretsMatch("short", "a-much-longer-secret"), false);
  });
  await check("empty string never matches a real secret", () => {
    assert.equal(secretsMatch("", "real-secret"), false);
  });

  console.log("geocode() cache");
  await check("caches a resolved query — second call doesn't refetch", async () => {
    let calls = 0;
    // @ts-expect-error test stub
    global.fetch = async () => {
      calls++;
      return {
        ok: true,
        json: async () => [{ lat: "1", lon: "2", display_name: "Test Place" }],
      };
    };
    const key = `security-check-${Date.now()}`;
    const first = await geocode(key);
    const second = await geocode(key);
    assert.deepEqual(first, second);
    assert.equal(calls, 1, `expected 1 fetch call, got ${calls}`);
  });

  console.log();
  if (failures > 0) {
    console.error(`${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log("All security boundary checks passed.");
}

main();

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  haversineProvider,
  googleProvider,
  getTravelTimeProvider,
} from "@/lib/travel-time";

const BOSTON = { lat: 42.3601, lng: -71.0589 };
const WORCESTER = { lat: 42.2626, lng: -71.8023 };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("haversineProvider", () => {
  it("returns 0 minutes for identical points", async () => {
    expect(await haversineProvider.travelMinutes(BOSTON, BOSTON)).toBe(0);
  });

  it("estimates minutes from straight-line distance at the average speed", async () => {
    // Boston -> Worcester is ~40 miles by haversine; at ~30 mph that is ~80 min
    const minutes = await haversineProvider.travelMinutes(BOSTON, WORCESTER);
    expect(minutes).toBeGreaterThanOrEqual(70);
    expect(minutes).toBeLessThanOrEqual(95);
  });

  it("makes no network request", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await haversineProvider.travelMinutes(BOSTON, WORCESTER);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("getTravelTimeProvider", () => {
  it("returns the free haversine provider when the billing flag is unset", () => {
    vi.stubEnv("GOOGLE_MAPS_BILLING_ENABLED", "");
    expect(getTravelTimeProvider()).toBe(haversineProvider);
  });

  it("returns the free haversine provider when the billing flag is 'false'", () => {
    vi.stubEnv("GOOGLE_MAPS_BILLING_ENABLED", "false");
    expect(getTravelTimeProvider()).toBe(haversineProvider);
  });

  it("returns the Google provider only when GOOGLE_MAPS_BILLING_ENABLED=true", () => {
    vi.stubEnv("GOOGLE_MAPS_BILLING_ENABLED", "true");
    expect(getTravelTimeProvider()).toBe(googleProvider);
  });
});

describe("googleProvider", () => {
  it("reads drive time from the Distance Matrix response", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key");
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        rows: [{ elements: [{ status: "OK", duration: { value: 1234 } }] }],
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const minutes = await googleProvider.travelMinutes(BOSTON, WORCESTER);
    expect(minutes).toBe(21); // ceil(1234 / 60)
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("falls back to the haversine estimate when the API call fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const minutes = await googleProvider.travelMinutes(BOSTON, WORCESTER);
    const expected = await haversineProvider.travelMinutes(BOSTON, WORCESTER);
    expect(minutes).toBe(expected);
  });
});

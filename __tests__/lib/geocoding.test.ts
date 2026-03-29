import { describe, it, expect, vi } from "vitest";
import { haversineDistance, geocode } from "@/lib/geocoding";

describe("haversineDistance", () => {
  it("returns 0 for same point", () => {
    expect(haversineDistance(42.36, -71.06, 42.36, -71.06)).toBe(0);
  });

  it("computes Boston to New York (~190 miles)", () => {
    const d = haversineDistance(42.3601, -71.0589, 40.7128, -74.006);
    expect(d).toBeGreaterThan(180);
    expect(d).toBeLessThan(200);
  });

  it("computes Boston to Cambridge (~3 miles)", () => {
    const d = haversineDistance(42.3601, -71.0589, 42.3736, -71.1097);
    expect(d).toBeGreaterThan(2);
    expect(d).toBeLessThan(5);
  });
});

describe("geocode", () => {
  it("returns coordinates for valid location", async () => {
    const mockResponse = [
      { lat: "42.3601", lon: "-71.0589", display_name: "Boston, MA, USA" },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await geocode("Boston, MA");
    expect(result).toEqual({
      lat: 42.3601,
      lng: -71.0589,
      displayName: "Boston, MA, USA",
    });
  });

  it("returns null for empty query", async () => {
    const result = await geocode("");
    expect(result).toBeNull();
  });

  it("returns null when API returns no results", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    const result = await geocode("xyznonexistent");
    expect(result).toBeNull();
  });

  it("returns null on fetch error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    const result = await geocode("Boston");
    expect(result).toBeNull();
  });
});

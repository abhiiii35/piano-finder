import { describe, it, expect } from "vitest";
import { optimizeRoute } from "@/lib/route-optimize";

const HOME = { lat: 42.36, lng: -71.06 }; // Boston area

describe("optimizeRoute", () => {
  it("returns empty order and legs for empty stops", () => {
    const result = optimizeRoute(HOME, []);

    expect(result.order).toEqual([]);
    expect(result.legs).toEqual([]);
    expect(result.totalMiles).toBe(0);
    expect(result.totalMinutes).toBe(0);
    expect(result.unrouted).toEqual([]);
  });

  it("handles single stop: home -> stop -> home", () => {
    const result = optimizeRoute(HOME, [
      { id: "stop-1", lat: 42.38, lng: -71.07 },
    ]);

    expect(result.order).toEqual(["stop-1"]);
    expect(result.legs).toHaveLength(2); // home->stop, stop back to home
    expect(result.legs[0].fromId).toBe(null); // from home
    expect(result.legs[0].toId).toBe("stop-1");
    expect(result.legs[1].fromId).toBe("stop-1");
    expect(result.legs[1].toId).toBe("home");

    // Verify round-trip: miles to stop should equal miles back
    const dist1 = result.legs[0].miles;
    const dist2 = result.legs[1].miles;
    expect(Math.abs(dist1 - dist2)).toBeLessThan(0.1); // should be equal (or very close)

    // totalMiles should be roughly 2x single leg
    expect(result.totalMiles).toBeGreaterThan(dist1 * 1.8);
    expect(result.totalMiles).toBeLessThan(dist1 * 2.2);
  });

  it("uses nearest-neighbor algorithm for 3 stops", () => {
    // Create 3 stops in a known order to test nearest-neighbor
    // If home is at (42.36, -71.06):
    // Stop A is close: (42.37, -71.05) ~1 mile
    // Stop B is far: (42.40, -71.10) ~3.5 miles
    // Stop C is medium: (42.35, -71.08) ~1.5 miles
    // Nearest-neighbor should pick: A -> C -> B -> home

    const result = optimizeRoute(HOME, [
      { id: "stop-a", lat: 42.37, lng: -71.05 }, // ~1 mi from home
      { id: "stop-b", lat: 42.40, lng: -71.10 }, // ~3.5 mi from home
      { id: "stop-c", lat: 42.35, lng: -71.08 }, // ~1.5 mi from home
    ]);

    // First stop should be A (closest to home)
    expect(result.order[0]).toBe("stop-a");
    // Second should be C (closest to A)
    expect(result.order[1]).toBe("stop-c");
    // Third should be B (only one left)
    expect(result.order[2]).toBe("stop-b");

    // Verify 4 legs: home->A, A->C, C->B, B->home
    expect(result.legs).toHaveLength(4);
  });

  it("flags stops with missing coordinates as unrouted", () => {
    const result = optimizeRoute(HOME, [
      { id: "stop-1", lat: 42.37, lng: -71.05 },
      { id: "stop-2", lat: null, lng: -71.08 }, // missing lat
      { id: "stop-3", lat: 42.35, lng: null }, // missing lng
      { id: "stop-4", lat: null, lng: null }, // missing both
    ]);

    expect(result.order).toEqual(["stop-1"]);
    expect(result.unrouted).toContain("stop-2");
    expect(result.unrouted).toContain("stop-3");
    expect(result.unrouted).toContain("stop-4");
    expect(result.unrouted).toHaveLength(3);
  });

  it("rounds miles to 1 decimal place", () => {
    const result = optimizeRoute(HOME, [
      { id: "stop-1", lat: 42.365, lng: -71.059 },
    ]);

    result.legs.forEach((leg) => {
      const str = leg.miles.toString();
      const decimals = (str.split(".")[1] || "").length;
      expect(decimals).toBeLessThanOrEqual(1);
    });

    const milesStr = result.totalMiles.toString();
    const decimals = (milesStr.split(".")[1] || "").length;
    expect(decimals).toBeLessThanOrEqual(1);
  });

  it("includes road factor (1.3x) in distance calculation", () => {
    // Single stop to verify road factor
    const result = optimizeRoute(HOME, [
      { id: "stop-1", lat: 42.37, lng: -71.05 },
    ]);

    // First leg: home to stop
    const leg = result.legs[0];
    // Haversine distance should be around 1 mile, times 1.3 = ~1.3 miles
    expect(leg.miles).toBeGreaterThan(1.0);
    expect(leg.miles).toBeLessThan(1.5);
  });

  it("calculates totalMinutes from totalMiles at 30 mph", () => {
    const result = optimizeRoute(HOME, [
      { id: "stop-1", lat: 42.37, lng: -71.05 },
      { id: "stop-2", lat: 42.35, lng: -71.08 },
    ]);

    // totalMinutes = totalMiles / 30 * 60
    const expectedMinutes = Math.round((result.totalMiles / 30) * 60);
    expect(result.totalMinutes).toBe(expectedMinutes);
  });
});

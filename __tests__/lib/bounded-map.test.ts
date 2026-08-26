import { describe, it, expect } from "vitest";
import { boundedSet } from "@/lib/bounded-map";

describe("boundedSet", () => {
  it("inserts under the cap without evicting", () => {
    const map = new Map<string, number>();
    boundedSet(map, "a", 1, 2);
    boundedSet(map, "b", 2, 2);
    expect(map.size).toBe(2);
    expect([...map.entries()]).toEqual([
      ["a", 1],
      ["b", 2],
    ]);
  });

  it("evicts the oldest entry once at the cap", () => {
    const map = new Map<string, number>();
    boundedSet(map, "a", 1, 2);
    boundedSet(map, "b", 2, 2);
    boundedSet(map, "c", 3, 2);

    expect(map.size).toBe(2);
    expect(map.has("a")).toBe(false);
    expect(map.get("b")).toBe(2);
    expect(map.get("c")).toBe(3);
  });

  it("updating an existing key does not evict (not a new entry)", () => {
    const map = new Map<string, number>();
    boundedSet(map, "a", 1, 2);
    boundedSet(map, "b", 2, 2);
    boundedSet(map, "a", 99, 2);

    expect(map.size).toBe(2);
    expect(map.get("a")).toBe(99);
    expect(map.get("b")).toBe(2);
  });
});

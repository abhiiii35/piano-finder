import { describe, it, expect } from "vitest";
import { pianoSchema } from "@/lib/validations/piano";

describe("pianoSchema", () => {
  it("accepts a full valid piano", () => {
    const result = pianoSchema.safeParse({
      type: "GRAND",
      make: "Steinway",
      model: "Model B",
      serialNumber: "SN12345",
      year: "1998",
      roomLocation: "Living room",
      tuningFrequencyMonths: "6",
      damppChaserInstalled: "on",
      notes: "Bright tone",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty piano (all fields optional)", () => {
    expect(pianoSchema.safeParse({}).success).toBe(true);
  });

  it("defaults tuningFrequencyMonths to 6 when omitted", () => {
    const result = pianoSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.tuningFrequencyMonths).toBe(6);
  });

  it("accepts the year boundary 1800", () => {
    expect(pianoSchema.safeParse({ year: "1800" }).success).toBe(true);
  });

  it("accepts the year boundary 2100", () => {
    expect(pianoSchema.safeParse({ year: "2100" }).success).toBe(true);
  });

  it("rejects a year just below the boundary (1799)", () => {
    expect(pianoSchema.safeParse({ year: "1799" }).success).toBe(false);
  });

  it("rejects a year just above the boundary (2101)", () => {
    expect(pianoSchema.safeParse({ year: "2101" }).success).toBe(false);
  });

  it("treats damppChaserInstalled as false when unchecked (field absent)", () => {
    const result = pianoSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.damppChaserInstalled).toBe(false);
  });
});

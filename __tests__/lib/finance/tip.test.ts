import { describe, it, expect } from "vitest";
import { isValidTipCents } from "@/lib/finance/tip";

describe("isValidTipCents", () => {
  it("accepts zero (no tip)", () => {
    expect(isValidTipCents(0, 17500)).toBe(true);
  });

  it("accepts a tip equal to 100% of the total", () => {
    expect(isValidTipCents(17500, 17500)).toBe(true);
  });

  it("rejects a tip over 100% of the total", () => {
    expect(isValidTipCents(17501, 17500)).toBe(false);
  });

  it("rejects a negative tip", () => {
    expect(isValidTipCents(-100, 17500)).toBe(false);
  });

  it("rejects a non-integer tip", () => {
    expect(isValidTipCents(100.5, 17500)).toBe(false);
  });

  it("accepts an ordinary in-range tip", () => {
    expect(isValidTipCents(2625, 17500)).toBe(true); // 15%
  });
});

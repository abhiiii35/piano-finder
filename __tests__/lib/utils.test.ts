import { describe, it, expect } from "vitest";
import { cn, formatCents, toCents } from "@/lib/utils";

describe("utils", () => {
  describe("cn", () => {
    it("merges class names", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });
    it("handles conditional classes", () => {
      expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
    });
    it("deduplicates tailwind classes", () => {
      expect(cn("p-4", "p-2")).toBe("p-2");
    });
  });

  describe("formatCents", () => {
    it("formats cents as USD", () => {
      expect(formatCents(17500)).toBe("$175.00");
    });
    it("handles zero", () => {
      expect(formatCents(0)).toBe("$0.00");
    });
    it("handles small amounts", () => {
      expect(formatCents(50)).toBe("$0.50");
    });
  });

  describe("toCents", () => {
    it("converts dollars to cents", () => {
      expect(toCents(175)).toBe(17500);
    });
    it("rounds fractional cents", () => {
      expect(toCents(175.555)).toBe(17556);
    });
    it("handles zero", () => {
      expect(toCents(0)).toBe(0);
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  parseHistoryViewPrefs,
  parseClientViewPrefs,
  nextDueLabel,
  computeDamppChaserStat,
  DEFAULT_QUICK_LOG_PRESETS,
} from "@/lib/service-history";

describe("parseHistoryViewPrefs", () => {
  it("fills in defaults for an empty JSON object", () => {
    const prefs = parseHistoryViewPrefs("{}");
    expect(prefs.order).toBe("newest");
    expect(prefs.show).toEqual({ readings: true, photos: true, recommendations: true, internalNotes: true });
    expect(prefs.quickLogPresets).toEqual([]);
  });

  it("falls back to defaults on malformed JSON instead of throwing", () => {
    expect(() => parseHistoryViewPrefs("not json")).not.toThrow();
    expect(parseHistoryViewPrefs("not json").order).toBe("newest");
  });

  it("round-trips a fully-specified value", () => {
    const stored = JSON.stringify({
      order: "oldest",
      show: { readings: false, photos: true, recommendations: false, internalNotes: true },
      quickLogPresets: ["Voicing touch-up"],
    });
    expect(parseHistoryViewPrefs(stored)).toEqual({
      order: "oldest",
      show: { readings: false, photos: true, recommendations: false, internalNotes: true },
      quickLogPresets: ["Voicing touch-up"],
    });
  });
});

describe("parseClientViewPrefs", () => {
  it("defaults prices to hidden and everything else visible", () => {
    const prefs = parseClientViewPrefs("{}");
    expect(prefs.show).toEqual({
      readings: true,
      photos: true,
      recommendations: true,
      workPerformed: true,
      prices: false,
    });
  });
});

describe("nextDueLabel", () => {
  it("returns null with no prior service", () => {
    expect(nextDueLabel(null, 6)).toBeNull();
  });

  it("crosses a year boundary: Dec 15 + 6 months = June next year", () => {
    const label = nextDueLabel(new Date(2025, 11, 15), 6);
    expect(label).toBe("Due around June 2026");
  });

  it("clamps day-of-month overflow: Jan 31 + 1 month = Feb (not March)", () => {
    const label = nextDueLabel(new Date(2026, 0, 31), 1);
    expect(label).toBe("Due around February 2026");
  });
});

describe("computeDamppChaserStat", () => {
  it("is hidden when either group has fewer than 3 readings", () => {
    const rows = [
      { pitchOffsetCents: 5, damppChaserInstalled: true },
      { pitchOffsetCents: 6, damppChaserInstalled: true },
      { pitchOffsetCents: -20, damppChaserInstalled: false },
      { pitchOffsetCents: -25, damppChaserInstalled: false },
      { pitchOffsetCents: -18, damppChaserInstalled: false },
    ];
    // with-group has only 2 readings
    expect(computeDamppChaserStat(rows)).toBeNull();
  });

  it("appears once both groups reach exactly 3 readings, using absolute-value averages", () => {
    const rows = [
      { pitchOffsetCents: 5, damppChaserInstalled: true },
      { pitchOffsetCents: -5, damppChaserInstalled: true },
      { pitchOffsetCents: 10, damppChaserInstalled: true },
      { pitchOffsetCents: -20, damppChaserInstalled: false },
      { pitchOffsetCents: 20, damppChaserInstalled: false },
      { pitchOffsetCents: -30, damppChaserInstalled: false },
    ];
    const stat = computeDamppChaserStat(rows);
    expect(stat).not.toBeNull();
    expect(stat!.withDampChaser).toBeCloseTo((5 + 5 + 10) / 3);
    expect(stat!.withoutDampChaser).toBeCloseTo((20 + 20 + 30) / 3);
  });

  it("ignores null readings when counting toward the 3-reading minimum", () => {
    const rows = [
      { pitchOffsetCents: null, damppChaserInstalled: true },
      { pitchOffsetCents: 5, damppChaserInstalled: true },
      { pitchOffsetCents: 5, damppChaserInstalled: true },
      { pitchOffsetCents: 5, damppChaserInstalled: false },
      { pitchOffsetCents: 5, damppChaserInstalled: false },
      { pitchOffsetCents: 5, damppChaserInstalled: false },
    ];
    // with-group only has 2 non-null readings
    expect(computeDamppChaserStat(rows)).toBeNull();
  });
});

describe("DEFAULT_QUICK_LOG_PRESETS", () => {
  it("includes the five required defaults", () => {
    expect(DEFAULT_QUICK_LOG_PRESETS).toEqual([
      "Tuned to A440",
      "Pitch raise",
      "Regulation",
      "Voicing",
      "Repair",
    ]);
  });
});

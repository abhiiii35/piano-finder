import { describe, it, expect } from "vitest";
import {
  hasLegacyPianoData,
  legacyPianoData,
  selectRecordsToBackfill,
} from "../../scripts/backfill-pianos";

describe("hasLegacyPianoData", () => {
  it("is true when any legacy piano field is set", () => {
    expect(hasLegacyPianoData({ id: "r1", pianoMake: "Steinway", pianoModel: null, serialNumber: null, pianoLocation: null })).toBe(true);
    expect(hasLegacyPianoData({ id: "r1", pianoMake: null, pianoModel: null, serialNumber: null, pianoLocation: "Living room" })).toBe(true);
  });

  it("is false when no legacy piano field is set", () => {
    expect(hasLegacyPianoData({ id: "r1", pianoMake: null, pianoModel: null, serialNumber: null, pianoLocation: null })).toBe(false);
  });
});

describe("legacyPianoData", () => {
  it("maps legacy fields onto the new Piano shape", () => {
    expect(
      legacyPianoData({
        id: "record-1",
        pianoMake: "Steinway",
        pianoModel: "Model B",
        serialNumber: "SN1",
        pianoLocation: "Living room",
      })
    ).toEqual({
      customerRecordId: "record-1",
      make: "Steinway",
      model: "Model B",
      serialNumber: "SN1",
      roomLocation: "Living room",
    });
  });
});

describe("selectRecordsToBackfill (idempotency)", () => {
  it("selects a record with legacy data and zero Piano rows", () => {
    const records = [
      { id: "r1", pianoMake: "Steinway", pianoModel: null, serialNumber: null, pianoLocation: null, pianos: [] },
    ];
    expect(selectRecordsToBackfill(records)).toHaveLength(1);
  });

  it("skips a record that already has a Piano row (already backfilled)", () => {
    const records = [
      {
        id: "r1",
        pianoMake: "Steinway",
        pianoModel: null,
        serialNumber: null,
        pianoLocation: null,
        pianos: [{ id: "piano-1" }],
      },
    ];
    expect(selectRecordsToBackfill(records)).toHaveLength(0);
  });

  it("skips a record with no legacy piano data", () => {
    const records = [
      { id: "r1", pianoMake: null, pianoModel: null, serialNumber: null, pianoLocation: null, pianos: [] },
    ];
    expect(selectRecordsToBackfill(records)).toHaveLength(0);
  });

  it("is a no-op on a second pass over its own output shape", () => {
    // Simulates re-running the script: once a record is backfilled, the next
    // query would report a non-empty pianos array, so a second run selects it again.
    const alreadyBackfilled = [
      { id: "r1", pianoMake: "Steinway", pianoModel: null, serialNumber: null, pianoLocation: null, pianos: [{ id: "piano-1" }] },
    ];
    expect(selectRecordsToBackfill(alreadyBackfilled)).toHaveLength(0);
  });
});

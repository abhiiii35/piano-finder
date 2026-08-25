import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../helpers/mocks";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { buildClientTimelineEntries, type ClientFacingServiceRecordRow } from "@/lib/client-timeline";

function row(overrides: Partial<ClientFacingServiceRecordRow> = {}): ClientFacingServiceRecordRow {
  return {
    id: "rec-1",
    date: new Date(2026, 5, 1),
    source: "MANUAL",
    bookingId: null,
    workPerformed: "Tuned to A440",
    pitchOffsetCents: 5,
    humidityPct: 45,
    temperatureF: 70,
    recommendations: "Keep it away from the radiator.",
    photos: "[]",
    clientVisible: true,
    ...overrides,
  };
}

const showAll = { readings: true, photos: true, recommendations: true, workPerformed: true, prices: false };

describe("buildClientTimelineEntries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("drops records the technician marked not client-visible", async () => {
    const rows = [row({ id: "visible" }), row({ id: "hidden", clientVisible: false })];
    const entries = await buildClientTimelineEntries(rows, { show: showAll });
    expect(entries.map((e) => e.id)).toEqual(["visible"]);
  });

  it("never leaks internal notes even if a caller smuggles the field in", async () => {
    const withNotes = row({ id: "rec-1" }) as ClientFacingServiceRecordRow & { notes: string };
    withNotes.notes = "internal secret";
    const entries = await buildClientTimelineEntries([withNotes], { show: showAll });
    expect(entries[0]).not.toHaveProperty("notes");
  });

  it("does not attach prices when clientPrefs.show.prices is off", async () => {
    const rows = [row({ id: "p1", source: "PLATFORM", bookingId: "booking-1" })];
    const entries = await buildClientTimelineEntries(rows, { show: { ...showAll, prices: false } });
    expect(entries[0].priceCents).toBeNull();
    expect(prismaMock.booking.findMany).not.toHaveBeenCalled();
  });

  it("batches a single booking lookup and attaches priceCents when prices is on", async () => {
    const rows = [
      row({ id: "p1", source: "PLATFORM", bookingId: "booking-1" }),
      row({ id: "p2", source: "PLATFORM", bookingId: "booking-2" }),
      row({ id: "m1", source: "MANUAL", bookingId: null }),
    ];
    prismaMock.booking.findMany.mockResolvedValue([
      { id: "booking-1", totalCents: 17500 },
      { id: "booking-2", totalCents: 25000 },
    ]);

    const entries = await buildClientTimelineEntries(rows, { show: { ...showAll, prices: true } });

    expect(prismaMock.booking.findMany).toHaveBeenCalledOnce();
    expect(prismaMock.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ["booking-1", "booking-2"] } } })
    );
    expect(entries.find((e) => e.id === "p1")?.priceCents).toBe(17500);
    expect(entries.find((e) => e.id === "p2")?.priceCents).toBe(25000);
    expect(entries.find((e) => e.id === "m1")?.priceCents).toBeNull();
  });

  it("sorts entries newest first", async () => {
    const rows = [row({ id: "old", date: new Date(2026, 0, 1) }), row({ id: "new", date: new Date(2026, 5, 1) })];
    const entries = await buildClientTimelineEntries(rows, { show: showAll });
    expect(entries.map((e) => e.id)).toEqual(["new", "old"]);
  });
});

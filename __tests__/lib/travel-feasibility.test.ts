import { describe, it, expect } from "vitest";
import { filterFeasibleSlots } from "@/lib/travel-feasibility";
import type { TravelTimeProvider } from "@/lib/travel-time";

// Fake provider: travel minutes = |lat difference|. Lets each test encode
// travel times directly in coordinates without touching real math.
const fakeProvider: TravelTimeProvider = {
  travelMinutes: async (from, to) => Math.abs(from.lat - to.lat),
};

const HOME = { lat: 20, lng: 0 }; // travel HOME -> CUSTOMER = 20 min
const CUSTOMER = { lat: 0, lng: 0 };
const FAR_STOP = { lat: 30, lng: 0 }; // travel CUSTOMER -> FAR_STOP = 30 min

const baseCtx = {
  durationMin: 60,
  windowStartMin: 540, // 09:00
  windowEndMin: 1020, // 17:00
  customer: CUSTOMER,
  homeBase: HOME,
  bufferMin: 30,
  stops: [],
  provider: fakeProvider,
};

describe("filterFeasibleSlots", () => {
  it("keeps all slots when there are no bookings and no home base coordinates", async () => {
    const result = await filterFeasibleSlots([540, 600, 900], {
      ...baseCtx,
      homeBase: null,
    });
    expect(result).toEqual([540, 600, 900]);
  });

  it("anchors the first slot of the day against the home base", async () => {
    // travel(HOME -> CUSTOMER)=20 + buffer 30 = 50 min needed after window start
    const result = await filterFeasibleSlots([540, 570, 590, 600], baseCtx);
    // 540: gap 0 < 50 — out. 570: gap 30 < 50 — out. 590: gap 50 — exactly fits.
    expect(result).toEqual([590, 600]);
  });

  it("anchors the last slot of the day against the home base", async () => {
    // slot end + travel(CUSTOMER -> HOME)=20 + buffer 30 must fit before window end
    // start + 60 + 50 <= 1020  =>  start <= 910
    const result = await filterFeasibleSlots([900, 910, 920], baseCtx);
    expect(result).toEqual([900, 910]);
  });

  it("checks the gap after a preceding booking", async () => {
    // Booking 10:00-11:00 at FAR_STOP: travel to customer 30 + buffer 30 = 60
    const stops = [{ startMin: 600, endMin: 660, location: FAR_STOP }];
    const result = await filterFeasibleSlots([700, 720, 780], {
      ...baseCtx,
      homeBase: null,
      stops,
    });
    // 700: gap 40 < 60 — out. 720: gap 60 — exactly fits.
    expect(result).toEqual([720, 780]);
  });

  it("checks the gap before a following booking", async () => {
    // Booking 14:00-15:00 at FAR_STOP; slot must end 60 min before it
    const stops = [{ startMin: 840, endMin: 900, location: FAR_STOP }];
    const result = await filterFeasibleSlots([690, 720, 750], {
      ...baseCtx,
      homeBase: null,
      stops,
    });
    // slot end + 60 <= 840  =>  start <= 720
    expect(result).toEqual([690, 720]);
  });

  it("requires both legs to fit between two neighboring bookings", async () => {
    // Bookings 09:00-10:00 and 13:00-14:00, both at FAR_STOP.
    // Each leg needs 60 min; slot is 60 min long.
    const stops = [
      { startMin: 540, endMin: 600, location: FAR_STOP },
      { startMin: 780, endMin: 840, location: FAR_STOP },
    ];
    const result = await filterFeasibleSlots([630, 660, 690, 720], {
      ...baseCtx,
      homeBase: null,
      stops,
    });
    // Before: start >= 600 + 60 = 660. After: start + 60 + 60 <= 780 => start <= 660.
    expect(result).toEqual([660]);
  });

  it("widening the buffer removes slots and narrowing restores them", async () => {
    const stops = [{ startMin: 600, endMin: 660, location: FAR_STOP }];
    const ctx = { ...baseCtx, homeBase: null, stops };

    const withDefault = await filterFeasibleSlots([720], { ...ctx, bufferMin: 30 });
    expect(withDefault).toEqual([720]); // gap 60 = 30 travel + 30 buffer

    const widened = await filterFeasibleSlots([720], { ...ctx, bufferMin: 31 });
    expect(widened).toEqual([]); // gap 60 < 30 travel + 31 buffer

    const narrowed = await filterFeasibleSlots([700], { ...ctx, bufferMin: 0 });
    expect(narrowed).toEqual([700]); // gap 40 >= 30 travel + 0 buffer
  });

  it("skips the leg when a neighboring booking has no coordinates", async () => {
    // Un-geocoded neighbor: we cannot assess that leg, so it must not filter.
    const stops = [{ startMin: 600, endMin: 660, location: null }];
    const result = await filterFeasibleSlots([690], {
      ...baseCtx,
      homeBase: null,
      stops,
    });
    expect(result).toEqual([690]);
  });

  it("still checks the other side when one neighbor lacks coordinates", async () => {
    const stops = [
      { startMin: 600, endMin: 660, location: null },
      { startMin: 840, endMin: 900, location: FAR_STOP },
    ];
    // After-leg: slot end + 60 <= 840 => start <= 720
    const result = await filterFeasibleSlots([690, 750], {
      ...baseCtx,
      homeBase: null,
      stops,
    });
    expect(result).toEqual([690]);
  });
});

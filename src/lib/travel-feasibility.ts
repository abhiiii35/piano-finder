import type { LatLng, TravelTimeProvider } from "@/lib/travel-time";

// One existing appointment on the technician's day, in minutes since local
// midnight. location is null when the booking was never geocoded.
export interface DayStop {
  startMin: number;
  endMin: number;
  location: LatLng | null;
}

export interface FeasibilityContext {
  durationMin: number;
  // The technician's availability window. The home base anchors the start and
  // end of the day: the technician leaves home at windowStart and must be back
  // by windowEnd.
  windowStartMin: number;
  windowEndMin: number;
  customer: LatLng;
  homeBase: LatLng | null;
  bufferMin: number;
  stops: DayStop[];
  provider: TravelTimeProvider;
}

/**
 * Keeps only the slot starts where travel + buffer fits the gap on both sides:
 * previous stop -> customer before the slot, customer -> next stop after it.
 * Previous/next fall back to the home base when there is no neighboring
 * booking that day. A leg whose endpoint has no coordinates cannot be assessed
 * and never filters (fail open).
 */
export async function filterFeasibleSlots(
  slotStartsMin: number[],
  ctx: FeasibilityContext
): Promise<number[]> {
  const stops = [...ctx.stops].sort((a, b) => a.startMin - b.startMin);

  // Cache provider calls: every slot sharing a neighbor needs the same leg,
  // and with the Google provider each call is billed.
  const cache = new Map<string, Promise<number>>();
  const travel = (from: LatLng, to: LatLng) => {
    const key = `${from.lat},${from.lng}|${to.lat},${to.lng}`;
    let hit = cache.get(key);
    if (!hit) {
      hit = ctx.provider.travelMinutes(from, to);
      cache.set(key, hit);
    }
    return hit;
  };

  const feasible: number[] = [];
  for (const startMin of slotStartsMin) {
    const endMin = startMin + ctx.durationMin;

    const prev = stops.filter((s) => s.endMin <= startMin).pop() ?? null;
    const next = stops.find((s) => s.startMin >= endMin) ?? null;

    const beforeOrigin = prev ? prev.location : ctx.homeBase;
    const gapBefore = startMin - (prev ? prev.endMin : ctx.windowStartMin);
    if (beforeOrigin) {
      const needed = (await travel(beforeOrigin, ctx.customer)) + ctx.bufferMin;
      if (gapBefore < needed) continue;
    }

    const afterDest = next ? next.location : ctx.homeBase;
    const gapAfter = (next ? next.startMin : ctx.windowEndMin) - endMin;
    if (afterDest) {
      const needed = (await travel(ctx.customer, afterDest)) + ctx.bufferMin;
      if (gapAfter < needed) continue;
    }

    feasible.push(startMin);
  }
  return feasible;
}

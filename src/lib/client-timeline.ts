import { prisma } from "@/lib/prisma";
import type { ClientViewPrefs } from "@/lib/service-history";
import type { TimelineEntry } from "@/components/records/timeline";

// Deliberately excludes `notes` (internal) — callers must select only these
// columns from the database so internal notes never even enter memory on a
// client-facing code path.
export type ClientFacingServiceRecordRow = {
  id: string;
  date: Date;
  source: string;
  bookingId: string | null;
  workPerformed: string | null;
  pitchOffsetCents: number | null;
  humidityPct: number | null;
  temperatureF: number | null;
  recommendations: string | null;
  photos: string; // JSON array of Cloudinary URLs
  clientVisible: boolean;
};

function parsePhotos(json: string): string[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// Builds client-safe timeline entries for the customer dashboard and the
// public share page: drops records the technician marked !clientVisible, and
// attaches PLATFORM booking amounts (one batched query) only when the
// technician's clientViewPrefs.show.prices is on.
export async function buildClientTimelineEntries(
  records: ClientFacingServiceRecordRow[],
  clientPrefs: ClientViewPrefs
): Promise<TimelineEntry[]> {
  const visible = records.filter((r) => r.clientVisible);

  let priceByBookingId = new Map<string, number>();
  if (clientPrefs.show.prices) {
    const bookingIds = visible
      .filter((r) => r.source === "PLATFORM" && r.bookingId)
      .map((r) => r.bookingId as string);
    if (bookingIds.length > 0) {
      const bookings = await prisma.booking.findMany({
        where: { id: { in: bookingIds } },
        select: { id: true, totalCents: true },
      });
      priceByBookingId = new Map(bookings.map((b) => [b.id, b.totalCents]));
    }
  }

  return visible
    .slice()
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((r) => ({
      id: r.id,
      date: r.date.toISOString(),
      source: r.source as TimelineEntry["source"],
      bookingId: r.bookingId,
      workPerformed: r.workPerformed,
      pitchOffsetCents: r.pitchOffsetCents,
      humidityPct: r.humidityPct,
      temperatureF: r.temperatureF,
      recommendations: r.recommendations,
      photos: parsePhotos(r.photos),
      priceCents: r.bookingId ? (priceByBookingId.get(r.bookingId) ?? null) : null,
    }));
}

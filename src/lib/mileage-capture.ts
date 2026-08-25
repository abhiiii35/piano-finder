import { prisma } from "@/lib/prisma";
import { haversineDistance } from "@/lib/geocoding";

// Straight-line distance underestimates actual driving distance; scale it up
// the same way travel-time estimates are deliberately conservative elsewhere.
const ROAD_FACTOR = 1.3;
// Legs shorter than this are noise (same-address rebooking, geocoding jitter).
const MIN_MILES = 0.1;

type Point = { lat: number; lng: number };

function drivingMiles(from: Point, to: Point): number {
  return haversineDistance(from.lat, from.lng, to.lat, to.lng) * ROAD_FACTOR;
}

function round1(miles: number): number {
  return Math.round(miles * 10) / 10;
}

function localDayRange(d: Date) {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function hasCoords<T extends { latitude: number | null; longitude: number | null }>(
  b: T
): b is T & { latitude: number; longitude: number } {
  return b.latitude != null && b.longitude != null;
}

/**
 * Auto-logs mileage when a booking is marked COMPLETED (called from
 * updateBookingStatus in src/actions/booking.ts).
 *
 * - Arrival leg: from the technician's last COMPLETED job earlier the same
 *   local day (by scheduledAt), or home base if this is the day's first job,
 *   to this booking. Idempotent per booking (checked via an existing
 *   autoCaptured MileageLog row).
 * - Return-home leg: one autoCaptured row per technician per local day, from
 *   whichever completed job is now latest that day to home base. Re-completing
 *   a booking later in the day replaces the prior return-home row rather than
 *   adding another.
 *
 * Skips a leg entirely when either endpoint is missing coordinates, or when
 * the computed distance is under 0.1 mi.
 */
export async function captureAutoMileage(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { technician: true },
  });
  if (!booking || !hasCoords(booking)) return;

  const technicianId = booking.technicianId;
  const destination: Point = { lat: booking.latitude, lng: booking.longitude };
  const { start: dayStart, end: dayEnd } = localDayRange(booking.scheduledAt);
  const homeBase: Point | null = hasCoords(booking.technician)
    ? { lat: booking.technician.latitude, lng: booking.technician.longitude }
    : null;

  // ── Arrival leg ──────────────────────────────────────────────
  const existingArrival = await prisma.mileageLog.findFirst({
    where: { bookingId, autoCaptured: true },
  });

  if (!existingArrival) {
    const earlierToday = await prisma.booking.findMany({
      where: {
        technicianId,
        status: "COMPLETED",
        scheduledAt: { gte: dayStart, lt: booking.scheduledAt },
      },
      orderBy: { scheduledAt: "desc" },
    });
    const priorJob = earlierToday.find(hasCoords) ?? null;
    const origin: Point | null = priorJob
      ? { lat: priorJob.latitude, lng: priorJob.longitude }
      : homeBase;

    if (origin) {
      const miles = round1(drivingMiles(origin, destination));
      if (miles >= MIN_MILES) {
        await prisma.mileageLog.create({
          data: {
            technicianId,
            date: booking.scheduledAt,
            miles,
            purpose: `Auto: drive to ${booking.city}`,
            bookingId,
            autoCaptured: true,
          },
        });
      }
    }
  }

  // ── Return-home leg ──────────────────────────────────────────
  if (homeBase) {
    const completedToday = await prisma.booking.findMany({
      where: {
        technicianId,
        status: "COMPLETED",
        scheduledAt: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { scheduledAt: "desc" },
    });
    const lastJob = completedToday.find(hasCoords) ?? null;

    await prisma.mileageLog.deleteMany({
      where: {
        technicianId,
        bookingId: null,
        autoCaptured: true,
        date: { gte: dayStart, lte: dayEnd },
      },
    });

    if (lastJob) {
      const miles = round1(
        drivingMiles({ lat: lastJob.latitude, lng: lastJob.longitude }, homeBase)
      );
      if (miles >= MIN_MILES) {
        await prisma.mileageLog.create({
          data: {
            technicianId,
            date: lastJob.scheduledAt,
            miles,
            purpose: "Auto: return home",
            bookingId: null,
            autoCaptured: true,
          },
        });
      }
    }
  }
}

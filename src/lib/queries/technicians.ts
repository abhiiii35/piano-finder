import { prisma } from "@/lib/prisma";
import { haversineDistance } from "@/lib/geocoding";

type AvailabilityWindow = "today" | "this-week" | "this-weekend" | "next-2-weeks";

/**
 * Parses a date string (yyyy-mm-dd) as a local date.
 * Critical: never use new Date("yyyy-mm-dd") — it parses as UTC midnight,
 * which is the previous day in US timezones.
 */
function parseLocalDate(dateStr: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(y, mo - 1, d);
}

/**
 * Format a Date as yyyy-mm-dd for storage/comparison.
 */
function formatDateAsString(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

/**
 * Get the end date for an availability window starting from today.
 */
function getWindowEndDate(window: AvailabilityWindow): Date {
  const today = new Date();
  const end = new Date(today);
  switch (window) {
    case "today":
      return end;
    case "this-week":
      // End of current week (Saturday)
      end.setDate(end.getDate() + (6 - end.getDay()));
      return end;
    case "this-weekend":
      // Saturday only
      end.setDate(end.getDate() + (6 - end.getDay()));
      return end;
    case "next-2-weeks":
      end.setDate(end.getDate() + 14);
      return end;
  }
}

/**
 * Get the next available slot for a technician within an optional window.
 * Respects availability slots and existing bookings (simple time-block conflicts, no travel time).
 * Returns the first available slot date, or null if none found.
 */
export async function getNextAvailableSlot(
  technicianId: string,
  window?: AvailabilityWindow
): Promise<Date | null> {
  // Fetch availability slots and bookings
  const [slots, bookings] = await Promise.all([
    prisma.availabilitySlot.findMany({
      where: { technicianId },
    }),
    prisma.booking.findMany({
      where: {
        technicianId,
        status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
      },
    }),
  ]);

  if (slots.length === 0) return null;

  const today = new Date();
  const endDate = window ? getWindowEndDate(window) : new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Scan forward from today
  for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const slot = slots.find((s) => s.dayOfWeek === dayOfWeek);

    if (!slot) continue;

    // Check if there are any bookings on this day that completely fill the slot
    const dateStr = formatDateAsString(d);
    const dayStart = parseLocalDate(dateStr);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayBookings = bookings.filter((b) => {
      const bookingStart = new Date(b.scheduledAt);
      return bookingStart >= dayStart && bookingStart < dayEnd;
    });

    // ponytail: simplified availability (no travel time). Upgrade to travel-aware
    // when we integrate with customer location in the booking flow.
    // Simple heuristic: if the slot has any free time (no booking spans the whole slot),
    // mark it as available.
    const hasAvailability = dayBookings.length === 0;
    if (hasAvailability) {
      return d;
    }
  }

  return null;
}

export async function searchTechnicians(filters: {
  q?: string;
  city?: string;
  state?: string;
  lat?: number;
  lng?: number;
  radiusMiles?: number;
  availabilityWindow?: AvailabilityWindow;
}) {
  const where: Record<string, unknown> = {
    isActive: true,
  };

  if (filters.city) where.city = filters.city;
  if (filters.state) where.state = filters.state;

  const profiles = await prisma.technicianProfile.findMany({
    where: {
      ...where,
      ...(filters.q
        ? {
            OR: [
              { businessName: { contains: filters.q } },
              { bio: { contains: filters.q } },
              { city: { contains: filters.q } },
              { user: { name: { contains: filters.q } } },
            ],
          }
        : {}),
    },
    include: {
      user: { select: { name: true, image: true } },
      services: { where: { isActive: true } },
    },
  });

  // Compute average ratings and next available slot
  const profilesWithRatings = await Promise.all(
    profiles.map(async (profile) => {
      const [reviews, nextAvailable] = await Promise.all([
        prisma.review.findMany({
          where: { booking: { technicianId: profile.id } },
          select: { rating: true },
        }),
        filters.availabilityWindow
          ? getNextAvailableSlot(profile.id, filters.availabilityWindow)
          : null,
      ]);

      const avgRating =
        reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;
      const minPrice =
        profile.services.length > 0
          ? Math.min(...profile.services.map((s) => s.priceCents))
          : 0;
      const distanceMiles =
        filters.lat != null &&
        filters.lng != null &&
        profile.latitude != null &&
        profile.longitude != null
          ? Math.round(
              haversineDistance(
                filters.lat,
                filters.lng,
                profile.latitude,
                profile.longitude
              )
            )
          : undefined;

      return {
        ...profile,
        avgRating,
        reviewCount: reviews.length,
        minPrice,
        ...(distanceMiles !== undefined ? { distanceMiles } : {}),
        ...(nextAvailable ? { nextAvailableAt: nextAvailable } : {}),
      };
    })
  );

  let sorted = profilesWithRatings;

  // Sort by availability when a window is active
  if (filters.availabilityWindow && filters.lat != null && filters.lng != null) {
    sorted = profilesWithRatings.sort((a, b) => {
      // Technicians with availability first, sorted by date, then by distance
      const aHasAvail = a.nextAvailableAt != null;
      const bHasAvail = b.nextAvailableAt != null;
      if (aHasAvail && !bHasAvail) return -1;
      if (!aHasAvail && bHasAvail) return 1;
      if (aHasAvail && bHasAvail) {
        const dateCompare = a.nextAvailableAt.getTime() - b.nextAvailableAt.getTime();
        if (dateCompare !== 0) return dateCompare;
      }
      return (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity);
    });
  } else if (filters.lat != null && filters.lng != null) {
    const radius = filters.radiusMiles ?? 25;
    sorted = profilesWithRatings
      .filter((p) => (p.distanceMiles ?? Infinity) <= radius)
      .sort((a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0));
  } else if (filters.availabilityWindow) {
    // No location filter; sort by availability date only
    sorted = profilesWithRatings.sort((a, b) => {
      const aHasAvail = a.nextAvailableAt != null;
      const bHasAvail = b.nextAvailableAt != null;
      if (aHasAvail && !bHasAvail) return -1;
      if (!aHasAvail && bHasAvail) return 1;
      if (aHasAvail && bHasAvail) {
        return a.nextAvailableAt.getTime() - b.nextAvailableAt.getTime();
      }
      return 0;
    });
  }

  return sorted;
}

export async function getTechnicianById(id: string) {
  const profile = await prisma.technicianProfile.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, image: true, email: true } },
      services: { where: { isActive: true }, orderBy: { priceCents: "asc" } },
      availabilitySlots: { orderBy: { dayOfWeek: "asc" } },
    },
  });

  if (!profile) return null;

  const reviews = await prisma.review.findMany({
    where: { booking: { technicianId: profile.id } },
    include: { author: { select: { name: true, image: true } } },
    orderBy: { createdAt: "desc" },
  });

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return { ...profile, reviews, avgRating, reviewCount: reviews.length };
}

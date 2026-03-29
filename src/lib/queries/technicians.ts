import { prisma } from "@/lib/prisma";
import { haversineDistance } from "@/lib/geocoding";

export async function searchTechnicians(filters: {
  q?: string;
  city?: string;
  state?: string;
  lat?: number;
  lng?: number;
  radiusMiles?: number;
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

  // Compute average ratings
  const profilesWithRatings = await Promise.all(
    profiles.map(async (profile) => {
      const reviews = await prisma.review.findMany({
        where: { booking: { technicianId: profile.id } },
        select: { rating: true },
      });
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
      };
    })
  );

  if (filters.lat != null && filters.lng != null) {
    const radius = filters.radiusMiles ?? 25;
    return profilesWithRatings
      .filter((p) => (p.distanceMiles ?? Infinity) <= radius)
      .sort((a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0));
  }

  return profilesWithRatings;
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

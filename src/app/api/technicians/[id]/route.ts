import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Public endpoint — select only public-safe fields. Never spread the raw
  // row: it also carries latitude/longitude/addressLine1 (home address) and
  // stripeAccountId (financial account id), neither of which any caller of
  // this route should see.
  const [technician, reviewAgg] = await Promise.all([
    prisma.technicianProfile.findUnique({
      where: { id },
      select: {
        id: true,
        bio: true,
        businessName: true,
        yearsExperience: true,
        certifications: true,
        serviceRadius: true,
        city: true,
        state: true,
        pianoTypes: true,
        travelFeeCents: true,
        ptgMember: true,
        portfolioPhotos: true,
        isVerified: true,
        isActive: true,
        user: { select: { name: true } },
        services: { where: { isActive: true }, orderBy: { priceCents: "asc" } },
      },
    }),
    prisma.review.aggregate({
      _avg: { rating: true },
      _count: true,
      where: { booking: { technicianId: id } },
    }),
  ]);

  if (!technician) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({
    technician: {
      ...technician,
      avgRating: reviewAgg._avg.rating ?? 0,
      reviewCount: reviewAgg._count,
    },
  });
}

import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [technician, reviewAgg] = await Promise.all([
    prisma.technicianProfile.findUnique({
      where: { id },
      include: {
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

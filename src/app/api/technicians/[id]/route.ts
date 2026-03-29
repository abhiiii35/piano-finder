import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const technician = await prisma.technicianProfile.findUnique({
    where: { id },
    include: {
      user: { select: { name: true } },
      services: { where: { isActive: true }, orderBy: { priceCents: "asc" } },
    },
  });

  if (!technician) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ technician });
}

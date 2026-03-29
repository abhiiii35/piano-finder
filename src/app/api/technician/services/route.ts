import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    return Response.json({ services: [] });
  }

  const services = await prisma.service.findMany({
    where: { technicianId: profile.id },
    orderBy: { name: "asc" },
  });

  return Response.json({ services });
}

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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { phone: true },
  });

  return Response.json({
    profile: profile
      ? { ...profile, phone: user?.phone ?? "" }
      : null,
  });
}

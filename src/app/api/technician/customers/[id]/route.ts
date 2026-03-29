import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    return Response.json({ error: "Profile not found" }, { status: 404 });
  }

  const record = await prisma.customerRecord.findFirst({
    where: { id, technicianId: profile.id },
  });

  if (!record) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ record });
}

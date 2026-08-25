import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CustomerDetailTabs } from "./customer-detail-tabs";
import { ShareLinkCard } from "@/components/records/share-link-card";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") redirect("/dashboard");

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/dashboard");

  const record = await prisma.customerRecord.findFirst({
    where: { id, technicianId: profile.id },
    include: {
      contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
      serviceLocations: { orderBy: [{ isPrimary: "desc" }, { label: "asc" }] },
      pianos: {
        include: { serviceLocation: { select: { label: true } } },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!record) notFound();

  return (
    <div className="space-y-6">
      <CustomerDetailTabs record={record} />
      <ShareLinkCard customerRecordId={record.id} shareToken={record.shareToken} />
    </div>
  );
}

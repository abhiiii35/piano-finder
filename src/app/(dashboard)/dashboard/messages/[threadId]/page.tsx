import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { MessageThread } from "@/components/messages/message-thread";

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/sign-in");

  // Parse threadId: "customerId:technicianId:general" or "customerId:technicianId:bookingId"
  const parts = threadId.split(":");
  if (parts.length !== 3) redirect("/dashboard");

  const [customerId, technicianId, context] = parts;

  // Verify user is a participant
  const tech = await prisma.technicianProfile.findUnique({
    where: { id: technicianId },
    include: { user: { select: { name: true } } },
  });
  if (!tech) redirect("/dashboard");

  if (session.user.id !== customerId && session.user.id !== tech.userId) {
    redirect("/dashboard");
  }

  const techName = tech.user.name ?? "Technician";
  const isBookingThread = context !== "general";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">
        {isBookingThread ? "Booking Messages" : `Message ${techName}`}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        {isBookingThread
          ? "Messages about this booking"
          : `Direct conversation with ${techName}`}
      </p>

      <Card>
        <CardContent className="pt-6">
          <MessageThread
            threadId={decodeURIComponent(threadId)}
            bookingId={isBookingThread ? context : undefined}
            technicianId={technicianId}
            currentUserId={session.user.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import Link from "next/link";
import { formatCents } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

export default async function CustomerBookingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CUSTOMER") redirect("/dashboard");

  const bookings = await prisma.booking.findMany({
    where: { customerId: session.user.id },
    include: {
      technician: {
        include: { user: { select: { name: true } } },
      },
      services: { include: { service: true } },
    },
    orderBy: { scheduledAt: "desc" },
  });

  const bookingIds = bookings.map((b) => b.id);
  const unreadCounts = bookingIds.length > 0
    ? await prisma.message.groupBy({
        by: ["bookingId"],
        where: {
          bookingId: { in: bookingIds },
          senderId: { not: session.user.id },
          isRead: false,
        },
        _count: true,
      })
    : [];

  const unreadMap = new Map(
    unreadCounts.map((u) => [u.bookingId, u._count])
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">My Bookings</h1>

      <div className="mt-8 space-y-4">
        {bookings.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">
            No bookings yet. Find a tuner to get started!
          </p>
        ) : (
          bookings.map((booking) => (
            <Link
              key={booking.id}
              href={`/dashboard/customer/bookings/${booking.id}`}
            >
              <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {booking.technician.businessName ??
                        booking.technician.user.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(
                        new Date(booking.scheduledAt),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.services
                        .map((s) => s.service.name)
                        .join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      {formatCents(booking.totalCents)}
                    </span>
                    {unreadMap.get(booking.id) ? (
                      <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        <MessageSquare className="h-3 w-3" />
                        {unreadMap.get(booking.id)}
                      </span>
                    ) : null}
                    <Badge>{booking.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

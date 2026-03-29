import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import Link from "next/link";
import { formatCents } from "@/lib/utils";

const statusColors: Record<string, string> = {
  PENDING: "secondary",
  CONFIRMED: "default",
  IN_PROGRESS: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

export default async function TechnicianBookingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") redirect("/dashboard");

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/dashboard");

  const bookings = await prisma.booking.findMany({
    where: { technicianId: profile.id },
    include: {
      customer: { select: { name: true, email: true } },
      services: { include: { service: true } },
      payment: true,
    },
    orderBy: { scheduledAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Bookings</h1>
      <p className="mt-1 text-muted-foreground">
        Manage your upcoming and past bookings
      </p>

      <div className="mt-8 space-y-4">
        {bookings.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">
            No bookings yet
          </p>
        ) : (
          bookings.map((booking) => (
            <Link
              key={booking.id}
              href={`/dashboard/technician/bookings/${booking.id}`}
            >
              <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {booking.customer.name ?? booking.customer.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(booking.scheduledAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.services.map((s) => s.service.name).join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      {formatCents(booking.totalCents)}
                    </span>
                    <Badge variant={statusColors[booking.status] as "default" | "secondary" | "destructive"}>
                      {booking.status}
                    </Badge>
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

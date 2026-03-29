import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { formatCents } from "@/lib/utils";
import { BookingStatusButtons } from "@/components/booking/booking-status-buttons";
import Link from "next/link";

export default async function CustomerBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CUSTOMER") redirect("/dashboard");

  const booking = await prisma.booking.findFirst({
    where: { id, customerId: session.user.id },
    include: {
      technician: {
        include: { user: { select: { name: true } } },
      },
      services: { include: { service: true } },
      payment: true,
      review: true,
    },
  });

  if (!booking) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Booking Details</h1>
        <Badge>{booking.status}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Technician</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium">
              {booking.technician.businessName ??
                booking.technician.user.name}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appointment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              {format(
                new Date(booking.scheduledAt),
                "MMMM d, yyyy 'at' h:mm a"
              )}
            </p>
            <p>{booking.durationMin} minutes</p>
            <p>
              {booking.addressLine1}, {booking.city}, {booking.state}{" "}
              {booking.zipCode}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Services & Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {booking.services.map((bs) => (
              <div key={bs.id} className="flex justify-between text-sm">
                <span>{bs.service.name}</span>
                <span>{formatCents(bs.priceCents)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold pt-2 border-t">
              <span>Total</span>
              <span>{formatCents(booking.totalCents)}</span>
            </div>
            {booking.payment && (
              <p className="text-sm text-muted-foreground mt-2">
                Payment: {booking.payment.status}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <BookingStatusButtons
          bookingId={booking.id}
          currentStatus={booking.status}
          role="CUSTOMER"
        />
        {booking.status === "COMPLETED" && !booking.review && (
          <Link href={`/dashboard/customer/bookings/${booking.id}/review`}>
            <Button>Leave a Review</Button>
          </Link>
        )}
      </div>
    </div>
  );
}

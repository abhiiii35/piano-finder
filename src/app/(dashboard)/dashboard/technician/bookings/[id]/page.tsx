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
import { MarkCashButton } from "@/components/booking/payment-actions";
import { MessageThread } from "@/components/messages/message-thread";
import Link from "next/link";

export default async function TechnicianBookingDetailPage({
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

  const booking = await prisma.booking.findFirst({
    where: { id, technicianId: profile.id },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      services: { include: { service: true } },
      payment: true,
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
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="font-medium">Name:</span> {booking.customer.name}</p>
            <p><span className="font-medium">Email:</span> {booking.customer.email}</p>
            {booking.customer.phone && (
              <p><span className="font-medium">Phone:</span> {booking.customer.phone}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appointment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Date:</span>{" "}
              {format(new Date(booking.scheduledAt), "MMMM d, yyyy 'at' h:mm a")}
            </p>
            <p><span className="font-medium">Duration:</span> {booking.durationMin} min</p>
            <p>
              <span className="font-medium">Location:</span>{" "}
              {booking.addressLine1}, {booking.city}, {booking.state} {booking.zipCode}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Services</CardTitle>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Piano Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {booking.pianoType && <p><span className="font-medium">Type:</span> {booking.pianoType}</p>}
            {booking.pianoMake && <p><span className="font-medium">Make:</span> {booking.pianoMake}</p>}
            {booking.pianoModel && <p><span className="font-medium">Model:</span> {booking.pianoModel}</p>}
            {booking.notes && <p><span className="font-medium">Notes:</span> {booking.notes}</p>}
            {!booking.pianoType && !booking.notes && (
              <p className="text-muted-foreground">No details provided</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3 flex-wrap">
        <BookingStatusButtons
          bookingId={booking.id}
          currentStatus={booking.status}
          role="TECHNICIAN"
        />
        {booking.payment?.status !== "SUCCEEDED" && (
          <MarkCashButton bookingId={booking.id} />
        )}
        <Link href={`/dashboard/technician/bookings/${booking.id}/invoice`}>
          <Button variant="outline">View Invoice</Button>
        </Link>
      </div>
      {booking.payment && (
        <Badge variant={booking.payment.status === "SUCCEEDED" ? "default" : "secondary"}>
          Payment: {booking.payment.status} ({booking.payment.method ?? "pending"})
        </Badge>
      )}

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <MessageThread
            threadId={`${booking.customerId}:${profile.id}:${booking.id}`}
            bookingId={booking.id}
            technicianId={profile.id}
            currentUserId={session.user.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}

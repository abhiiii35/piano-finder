import { addMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import { buildCalendarICS } from "@/lib/ics";

// No auth — the token itself is the auth. Anyone with the link can read this
// technician's non-cancelled bookings, which is what a calendar subscription
// URL is for.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const profile = await prisma.technicianProfile.findUnique({
    where: { calendarToken: token },
  });
  if (!profile) return new Response("Not found", { status: 404 });

  const now = new Date();
  const bookings = await prisma.booking.findMany({
    where: {
      technicianId: profile.id,
      status: { not: "CANCELLED" },
      scheduledAt: { gte: addMonths(now, -6), lte: addMonths(now, 6) },
    },
    include: {
      customer: { select: { name: true } },
      services: { include: { service: { select: { name: true } } } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const ics = buildCalendarICS(
    bookings.map((booking) => ({
      id: booking.id,
      scheduledAt: booking.scheduledAt,
      durationMin: booking.durationMin,
      customerName: booking.customer.name ?? "Customer",
      addressLine1: booking.addressLine1,
      addressLine2: booking.addressLine2,
      city: booking.city,
      state: booking.state,
      zipCode: booking.zipCode,
      serviceNames: booking.services.map((bs) => bs.service.name),
      notes: booking.notes,
    })),
    now
  );

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="calendar.ics"',
    },
  });
}

"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bookingSchema } from "@/lib/validations/booking";
import { geocode } from "@/lib/geocoding";
import { getTravelTimeProvider, type LatLng } from "@/lib/travel-time";
import { filterFeasibleSlots, type DayStop } from "@/lib/travel-feasibility";
import { sendEmail } from "@/lib/email";
import { bookingCreatedEmail, bookingReceivedEmail, bookingStatusEmail, bookingCancelledEmail } from "@/lib/emails/booking";
import { captureAutoMileage } from "@/lib/mileage-capture";
import { generateRemindersForBooking } from "@/actions/reminders";
import { createServiceRecordFromBooking } from "@/actions/service-record";
import { rateLimit, getClientIp } from "@/lib/ratelimit";

export async function createBooking(data: {
  technicianId: string;
  serviceIds: string[];
  scheduledAt: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  pianoType?: string;
  pianoMake?: string;
  pianoModel?: string;
  notes?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Please sign in to book" };

  // Check emailVerified from database (not session) so it reflects
  // verification that happened after sign-in
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true },
  });
  if (!currentUser?.emailVerified) {
    return { error: "Please verify your email before booking" };
  }

  const result = bookingSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { technicianId, serviceIds, scheduledAt, ...address } = result.data;

  // Fetch services to calculate total
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds }, technicianId },
  });

  if (services.length === 0) {
    return { error: "No valid services selected" };
  }

  const totalCents = services.reduce((sum, s) => sum + s.priceCents, 0);
  const durationMin = services.reduce((sum, s) => sum + s.durationMin, 0);

  const newStart = new Date(scheduledAt);
  const newEnd = new Date(newStart.getTime() + durationMin * 60 * 1000);
  const dateStr = scheduledAt.split("T")[0];

  // Geocode the job address once; coordinates are stored on the booking so
  // later feasibility checks against it never re-geocode.
  const customerCoords = await geocodeBookingAddress(address);

  // Server-side travel feasibility: never accept a slot the technician can't
  // reach (or leave) in time around neighboring appointments. Skipped when we
  // have no coordinates to judge with (fail open).
  if (customerCoords) {
    const window = await prisma.availabilitySlot.findFirst({
      where: { technicianId, dayOfWeek: newStart.getDay() },
    });
    if (window) {
      const dayBookings = await getActiveDayBookings(technicianId, dateStr);
      const ctx = await buildFeasibilityContext({
        technicianId,
        date: dateStr,
        durationMin,
        customer: customerCoords,
        windowStartMin: toMinutes(window.startTime),
        windowEndMin: toMinutes(window.endTime),
        dayBookings,
      });
      const requestedStartMin =
        newStart.getHours() * 60 + newStart.getMinutes();
      const feasible = await filterFeasibleSlots([requestedStartMin], ctx);
      if (feasible.length === 0) {
        const availableSlots = await computeAvailableSlots(
          technicianId,
          dateStr,
          durationMin,
          customerCoords
        );
        return {
          error:
            "That time doesn't leave enough travel time around the technician's other appointments",
          availableSlots,
        };
      }
    }
  }

  // Conflict check + create inside a transaction
  let booking;
  try {
    booking = await prisma.$transaction(async (tx) => {
      // Check for overlapping bookings on the same day
      const dayStart = new Date(newStart);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(newStart);
      dayEnd.setHours(23, 59, 59, 999);

      const conflict = await tx.booking.findFirst({
        where: {
          technicianId,
          status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
          scheduledAt: { gte: dayStart, lte: dayEnd },
        },
      });

      // Precise overlap check: newStart < existingEnd AND newEnd > existingStart
      if (conflict) {
        const conflictStart = new Date(conflict.scheduledAt).getTime();
        const conflictEnd = conflictStart + conflict.durationMin * 60 * 1000;
        if (newStart.getTime() < conflictEnd && newEnd.getTime() > conflictStart) {
          throw new Error("CONFLICT");
        }
      }

      // Reject a slot that falls inside a technician time-off block.
      const dayExceptions =
        (await tx.availabilityException.findMany({
          where: {
            technicianId,
            startsAt: { lt: dayEnd },
            endsAt: { gt: dayStart },
          },
        })) ?? [];
      const blockedByTimeOff = dayExceptions.some(
        (ex) =>
          newStart.getTime() < new Date(ex.endsAt).getTime() &&
          newEnd.getTime() > new Date(ex.startsAt).getTime()
      );
      if (blockedByTimeOff) {
        throw new Error("CONFLICT");
      }

      return tx.booking.create({
        data: {
          customerId: session.user.id,
          technicianId,
          status: "PENDING",
          scheduledAt: newStart,
          durationMin,
          totalCents,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2 ?? null,
          city: address.city,
          state: address.state,
          zipCode: address.zipCode,
          latitude: customerCoords?.lat ?? null,
          longitude: customerCoords?.lng ?? null,
          pianoType: address.pianoType ?? null,
          pianoMake: address.pianoMake ?? null,
          pianoModel: address.pianoModel ?? null,
          notes: address.notes ?? null,
          services: {
            create: services.map((s) => ({
              serviceId: s.id,
              priceCents: s.priceCents,
            })),
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CONFLICT") {
      // Fetch alternative slots for the same day, travel-filtered when possible
      const availableSlots = await computeAvailableSlots(technicianId, dateStr, durationMin, customerCoords);
      return {
        error: "This time slot is no longer available",
        availableSlots,
      };
    }
    throw error;
  }

  try {
    const techProfile = await prisma.technicianProfile.findUnique({
      where: { id: technicianId },
      include: { user: { select: { name: true, email: true } } },
    });
    const serviceNames = services.map((s) => s.name);
    if (session.user.email) {
      const email = bookingCreatedEmail(booking, techProfile?.user.name ?? "Your technician", serviceNames);
      await sendEmail({ to: session.user.email, ...email });
    }
    if (techProfile?.user.email) {
      const email = bookingReceivedEmail(booking, session.user.name ?? "Customer", serviceNames);
      await sendEmail({ to: techProfile.user.email, ...email });
    }
  } catch (error) {
    console.error("[EMAIL] Failed to send booking confirmation:", error);
  }

  revalidatePath("/dashboard/customer/bookings");
  revalidatePath("/dashboard/technician/bookings");
  return { success: true, bookingId: booking.id };
}

export async function updateBookingStatus(
  bookingId: string,
  newStatus: string
) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { technician: true },
  });

  if (!booking) return { error: "Booking not found" };

  // Authorization: technician can confirm/complete, customer can cancel
  const isTechnician = booking.technician.userId === session.user.id;
  const isCustomer = booking.customerId === session.user.id;

  const validTransitions: Record<string, { status: string[]; by: string[] }> = {
    PENDING: { status: ["CONFIRMED", "CANCELLED"], by: ["technician", "customer"] },
    CONFIRMED: { status: ["IN_PROGRESS", "CANCELLED"], by: ["technician", "customer"] },
    IN_PROGRESS: { status: ["COMPLETED"], by: ["technician"] },
  };

  const allowed = validTransitions[booking.status];
  if (!allowed || !allowed.status.includes(newStatus)) {
    return { error: "Invalid status transition" };
  }

  if (
    (newStatus === "CANCELLED" && !isCustomer && !isTechnician) ||
    (newStatus !== "CANCELLED" && !isTechnician)
  ) {
    return { error: "Not authorized for this action" };
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: newStatus },
  });

  try {
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: { select: { email: true } },
        technician: { include: { user: { select: { name: true, email: true } } } },
      },
    });
    if (updatedBooking) {
      if (newStatus === "CANCELLED") {
        const email = bookingCancelledEmail(updatedBooking);
        if (updatedBooking.customer.email) await sendEmail({ to: updatedBooking.customer.email, ...email });
        if (updatedBooking.technician.user.email) await sendEmail({ to: updatedBooking.technician.user.email, ...email });
      } else if (updatedBooking.customer.email) {
        const email = bookingStatusEmail(updatedBooking, newStatus, updatedBooking.technician.user.name ?? "Your technician");
        await sendEmail({ to: updatedBooking.customer.email, ...email });
      }
    }
  } catch (error) {
    console.error("[EMAIL] Failed to send status email:", error);
  }

  // Auto-populate CRM when booking completes
  if (newStatus === "COMPLETED") {
    try {
      const completedBooking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          customer: { select: { name: true, email: true, phone: true } },
        },
      });
      if (completedBooking?.customer.email) {
        await prisma.customerRecord.upsert({
          where: {
            technicianId_customerEmail: {
              technicianId: booking.technicianId,
              customerEmail: completedBooking.customer.email,
            },
          },
          update: {
            customerName: completedBooking.customer.name ?? undefined,
            customerPhone: completedBooking.customer.phone ?? undefined,
            pianoMake: completedBooking.pianoMake ?? undefined,
            pianoModel: completedBooking.pianoModel ?? undefined,
            pianoLocation: completedBooking.addressLine1 ?? undefined,
          },
          create: {
            technicianId: booking.technicianId,
            customerName: completedBooking.customer.name ?? "Customer",
            customerEmail: completedBooking.customer.email,
            customerPhone: completedBooking.customer.phone,
            pianoMake: completedBooking.pianoMake,
            pianoModel: completedBooking.pianoModel,
            pianoLocation: completedBooking.addressLine1,
          },
        });
      }
    } catch (error) {
      console.error("[CRM] Failed to auto-populate customer record:", error);
    }

    try {
      await generateRemindersForBooking(bookingId);
    } catch (error) {
      console.error("[REMINDERS] Failed to generate tune reminders:", error);
    }

    try {
      await createServiceRecordFromBooking(bookingId);
    } catch (error) {
      console.error("[RECORDS] Failed to create service record:", error);
    }

    try {
      await captureAutoMileage(bookingId);
    } catch (error) {
      console.error("[MILEAGE] Failed to auto-capture mileage:", error);
    }
  }

  revalidatePath(`/dashboard/customer/bookings/${bookingId}`);
  revalidatePath(`/dashboard/technician/bookings/${bookingId}`);
  revalidatePath("/dashboard/customer/bookings");
  revalidatePath("/dashboard/technician/bookings");
  return { success: true };
}

// ─── Availability & travel feasibility ──────────────────────────

// Parse a "yyyy-mm-dd" date string as a LOCAL date. new Date("yyyy-mm-dd")
// parses as UTC midnight, which lands on the previous local day in negative
// offsets and would compare slots against the wrong day's bookings.
function parseLocalDate(date: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  return new Date(y, mo - 1, d);
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function formatSlot(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
}

type BookingAddress = {
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
};

// Geocode a job address through the existing free geocoding path, falling
// back to a city-level lookup when the street address doesn't resolve.
async function geocodeBookingAddress(a: BookingAddress): Promise<LatLng | null> {
  const geo =
    (await geocode(`${a.addressLine1}, ${a.city}, ${a.state} ${a.zipCode}`)) ??
    (await geocode(`${a.city}, ${a.state} ${a.zipCode}`));
  return geo ? { lat: geo.lat, lng: geo.lng } : null;
}

async function getActiveDayBookings(technicianId: string, date: string) {
  const dayStart = parseLocalDate(date);
  const dayEnd = parseLocalDate(date);
  dayEnd.setHours(23, 59, 59, 999);

  return prisma.booking.findMany({
    where: {
      technicianId,
      scheduledAt: { gte: dayStart, lte: dayEnd },
      status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
    },
  });
}

// Time-off blocks overlapping this local day. `?? []` guards test mocks that
// don't stub this model; production Prisma always returns an array.
async function getDayExceptions(technicianId: string, date: string) {
  const dayStart = parseLocalDate(date);
  const dayEnd = parseLocalDate(date);
  dayEnd.setHours(23, 59, 59, 999);

  const exceptions = await prisma.availabilityException.findMany({
    where: {
      technicianId,
      startsAt: { lt: dayEnd },
      endsAt: { gt: dayStart },
    },
  });
  return exceptions ?? [];
}

type DayBookingRow = {
  scheduledAt: Date;
  durationMin: number;
  latitude: number | null;
  longitude: number | null;
};

function toDayStops(bookings: DayBookingRow[], date: string): DayStop[] {
  const midnight = parseLocalDate(date).getTime();
  return bookings.map((b) => {
    const startMin = Math.round(
      (new Date(b.scheduledAt).getTime() - midnight) / 60000
    );
    return {
      startMin,
      endMin: startMin + b.durationMin,
      location:
        b.latitude != null && b.longitude != null
          ? { lat: b.latitude, lng: b.longitude }
          : null,
    };
  });
}

async function buildFeasibilityContext(opts: {
  technicianId: string;
  date: string;
  durationMin: number;
  customer: LatLng;
  windowStartMin: number;
  windowEndMin: number;
  dayBookings: DayBookingRow[];
}) {
  const profile = await prisma.technicianProfile.findUnique({
    where: { id: opts.technicianId },
  });
  return {
    durationMin: opts.durationMin,
    windowStartMin: opts.windowStartMin,
    windowEndMin: opts.windowEndMin,
    customer: opts.customer,
    homeBase:
      profile?.latitude != null && profile?.longitude != null
        ? { lat: profile.latitude, lng: profile.longitude }
        : null,
    bufferMin: profile?.travelBufferMin ?? 30,
    stops: toDayStops(opts.dayBookings, opts.date),
    provider: getTravelTimeProvider(),
  };
}

async function computeAvailableSlots(
  technicianId: string,
  date: string,
  durationMin: number,
  customer: LatLng | null
): Promise<string[]> {
  const dayOfWeek = parseLocalDate(date).getDay();

  const slot = await prisma.availabilitySlot.findFirst({
    where: { technicianId, dayOfWeek },
  });

  if (!slot) return [];

  const existingBookings = await getActiveDayBookings(technicianId, date);
  const exceptions = await getDayExceptions(technicianId, date);

  // Generate 30-min slots, checking if the full duration fits
  const startMin = toMinutes(slot.startTime);
  const endMin = toMinutes(slot.endTime);
  const midnight = parseLocalDate(date).getTime();

  const candidates: number[] = [];
  for (let m = startMin; m < endMin; m += 30) {
    // Check if the full duration fits within availability
    if (m + durationMin > endMin) continue;

    // Check if the full duration window overlaps with any existing booking
    // or a technician time-off block.
    const slotStart = midnight + m * 60 * 1000;
    const slotEnd = slotStart + durationMin * 60 * 1000;
    const isBooked = existingBookings.some((b) => {
      const bookingStart = new Date(b.scheduledAt).getTime();
      const bookingEnd = bookingStart + b.durationMin * 60 * 1000;
      return slotStart < bookingEnd && slotEnd > bookingStart;
    });
    const isBlocked = exceptions.some((ex) => {
      const exStart = new Date(ex.startsAt).getTime();
      const exEnd = new Date(ex.endsAt).getTime();
      return slotStart < exEnd && slotEnd > exStart;
    });

    if (!isBooked && !isBlocked) candidates.push(m);
  }

  // Travel feasibility: with a customer location, drop slots the technician
  // couldn't reach (or leave) in time around neighboring appointments.
  let feasible = candidates;
  if (customer && candidates.length > 0) {
    const ctx = await buildFeasibilityContext({
      technicianId,
      date,
      durationMin,
      customer,
      windowStartMin: startMin,
      windowEndMin: endMin,
      dayBookings: existingBookings,
    });
    feasible = await filterFeasibleSlots(candidates, ctx);
  }

  return feasible.map(formatSlot);
}

export async function getAvailableSlots(
  technicianId: string,
  date: string,
  durationMin: number = 30,
  customerAddress?: BookingAddress
) {
  // Unauthenticated (public booking page) and can fan out to a paid Google
  // Maps call plus a free-but-abuse-limited Nominatim geocode — rate-limit
  // by IP so a scripted loop can't run up the bill or get the shared
  // server IP banned from Nominatim.
  const ip = await getClientIp();
  const limit = rateLimit(`available-slots:${ip}`, 30, 60_000);
  if (!limit.ok) return [];

  let customer: LatLng | null = null;
  if (customerAddress?.addressLine1 && customerAddress.city) {
    customer = await geocodeBookingAddress(customerAddress);
  }
  return computeAvailableSlots(technicianId, date, durationMin, customer);
}

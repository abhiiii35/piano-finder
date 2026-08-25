"use server";

import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTravelTimeProvider, type LatLng } from "@/lib/travel-time";
import { filterFeasibleSlots, type DayStop } from "@/lib/travel-feasibility";
import { sendEmail } from "@/lib/email";
import { rescheduleSchema, proposeTimesSchema } from "@/lib/validations/reschedule";
import {
  rescheduledNoticeEmail,
  proposalEmail,
  proposalAcceptedEmail,
} from "@/lib/emails/reschedule";

const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "IN_PROGRESS"];
const RESCHEDULABLE_STATUSES = ["PENDING", "CONFIRMED"];

// Not exported from src/actions/booking.ts — reimplemented minimally here
// rather than editing that file (per task boundaries).
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

type ReschedulableBooking = {
  id: string;
  technicianId: string;
  durationMin: number;
  latitude: number | null;
  longitude: number | null;
};

// Re-validates a candidate slot the same way createBooking does: no overlap
// with the technician's other active bookings that day, and — when the
// booking has coordinates and the technician has an availability window for
// that day — enough travel time around neighboring appointments. Excludes
// the booking being moved from its own conflict/feasibility set so shifting
// within the same day doesn't collide with the slot it's leaving. Throws
// "CONFLICT" or "INFEASIBLE"; fails open (returns) when there's nothing to
// judge feasibility against, matching createBooking's behavior.
async function assertSlotAvailable(booking: ReschedulableBooking, newStart: Date) {
  const newEnd = new Date(newStart.getTime() + booking.durationMin * 60000);
  const dayStart = new Date(newStart);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(newStart);
  dayEnd.setHours(23, 59, 59, 999);

  const dayBookings = await prisma.booking.findMany({
    where: {
      technicianId: booking.technicianId,
      id: { not: booking.id },
      status: { in: ACTIVE_STATUSES },
      scheduledAt: { gte: dayStart, lte: dayEnd },
    },
  });

  for (const b of dayBookings) {
    const bStart = new Date(b.scheduledAt).getTime();
    const bEnd = bStart + b.durationMin * 60000;
    if (newStart.getTime() < bEnd && newEnd.getTime() > bStart) {
      throw new Error("CONFLICT");
    }
  }

  // No coordinates on the booking (never geocoded) — nothing to judge
  // travel feasibility against, so fail open like createBooking does.
  if (booking.latitude == null || booking.longitude == null) return;

  const window = await prisma.availabilitySlot.findFirst({
    where: { technicianId: booking.technicianId, dayOfWeek: newStart.getDay() },
  });
  if (!window) return;

  const profile = await prisma.technicianProfile.findUnique({
    where: { id: booking.technicianId },
  });

  const midnight = dayStart.getTime();
  const stops: DayStop[] = dayBookings.map((b) => {
    const startMin = Math.round((new Date(b.scheduledAt).getTime() - midnight) / 60000);
    return {
      startMin,
      endMin: startMin + b.durationMin,
      location:
        b.latitude != null && b.longitude != null
          ? { lat: b.latitude, lng: b.longitude }
          : null,
    };
  });

  const ctx = {
    durationMin: booking.durationMin,
    windowStartMin: toMinutes(window.startTime),
    windowEndMin: toMinutes(window.endTime),
    customer: { lat: booking.latitude, lng: booking.longitude } as LatLng,
    homeBase:
      profile?.latitude != null && profile?.longitude != null
        ? { lat: profile.latitude, lng: profile.longitude }
        : null,
    bufferMin: profile?.travelBufferMin ?? 30,
    stops,
    provider: getTravelTimeProvider(),
  };

  const requestedStartMin = newStart.getHours() * 60 + newStart.getMinutes();
  const feasible = await filterFeasibleSlots([requestedStartMin], ctx);
  if (feasible.length === 0) throw new Error("INFEASIBLE");
}

function slotErrorMessage(err: unknown): string | null {
  if (err instanceof Error && err.message === "CONFLICT") return "That time is no longer available";
  if (err instanceof Error && err.message === "INFEASIBLE")
    return "That time doesn't leave enough travel time around the technician's other appointments";
  return null;
}

type EmailableBooking = {
  id: string;
  scheduledAt: Date;
  addressLine1: string;
  city: string;
  state: string;
  customer: { name: string | null; email: string | null };
  technician: { user: { name: string | null; email: string | null } };
};

async function sendRescheduledEmails(booking: EmailableBooking, newStart: Date) {
  try {
    const email = rescheduledNoticeEmail({ ...booking, scheduledAt: newStart });
    if (booking.customer.email) await sendEmail({ to: booking.customer.email, ...email });
    if (booking.technician.user.email) await sendEmail({ to: booking.technician.user.email, ...email });
  } catch (error) {
    console.error("[EMAIL] Failed to send reschedule notice:", error);
  }
}

export async function rescheduleBooking(bookingId: string, date: string, time: string) {
  const parsed = rescheduleSchema.safeParse({ date, time });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const session = await getServerSession(authOptions);
  if (!session) return { error: "Please sign in" };

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      technician: { include: { user: { select: { name: true, email: true } } } },
      customer: { select: { name: true, email: true } },
    },
  });
  if (!booking) return { error: "Booking not found" };

  const isTechnician = booking.technician.userId === session.user.id;
  const isCustomer = booking.customerId === session.user.id;
  if (!isTechnician && !isCustomer) return { error: "Not authorized for this action" };

  if (!RESCHEDULABLE_STATUSES.includes(booking.status)) {
    return { error: "This booking can no longer be rescheduled" };
  }

  const [y, mo, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const newStart = new Date(y, mo - 1, d, h, min);
  if (newStart.getTime() <= Date.now()) {
    return { error: "Pick a time in the future" };
  }

  // Customers may self-reschedule only up until the technician's cutoff;
  // technicians can reschedule anytime.
  if (isCustomer && !isTechnician) {
    const cutoffTime =
      booking.scheduledAt.getTime() - booking.technician.rescheduleCutoffHours * 60 * 60 * 1000;
    if (Date.now() >= cutoffTime) {
      return {
        error: `This booking can only be rescheduled at least ${booking.technician.rescheduleCutoffHours} hours before the appointment`,
      };
    }
  }

  try {
    await assertSlotAvailable(booking, newStart);
  } catch (err) {
    const message = slotErrorMessage(err);
    if (message) return { error: message };
    throw err;
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: bookingId }, data: { scheduledAt: newStart } });
    await tx.rescheduleProposal.updateMany({
      where: { bookingId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
  });

  await sendRescheduledEmails(booking, newStart);

  revalidatePath(`/dashboard/customer/bookings/${bookingId}`);
  revalidatePath(`/dashboard/technician/bookings/${bookingId}`);
  revalidatePath("/dashboard/customer/bookings");
  revalidatePath("/dashboard/technician/bookings");
  return { success: true };
}

export async function proposeRescheduleTimes(bookingId: string, slots: string[]) {
  const parsed = proposeTimesSchema.safeParse({ slots });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") return { error: "Not authorized for this action" };

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { technician: true },
  });
  if (!booking) return { error: "Booking not found" };
  if (booking.technician.userId !== session.user.id) return { error: "Not authorized for this action" };
  if (!booking.technician.proposeTimesEnabled) {
    return { error: "Turn on \"Offer suggested times\" in your profile settings first" };
  }
  if (!RESCHEDULABLE_STATUSES.includes(booking.status)) {
    return { error: "This booking can no longer be rescheduled" };
  }

  const now = Date.now();
  const parsedDates = parsed.data.slots.map((s) => new Date(s));
  if (parsedDates.some((dt) => isNaN(dt.getTime()) || dt.getTime() <= now)) {
    return { error: "Offered times must be in the future" };
  }

  const token = randomUUID().replace(/-/g, "");
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Math.min(now + sevenDaysMs, booking.scheduledAt.getTime()));

  const proposal = await prisma.$transaction(async (tx) => {
    await tx.rescheduleProposal.updateMany({
      where: { bookingId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    return tx.rescheduleProposal.create({
      data: {
        bookingId,
        token,
        slots: JSON.stringify(parsed.data.slots),
        expiresAt,
      },
    });
  });

  try {
    const customer = await prisma.user.findUnique({
      where: { id: booking.customerId },
      select: { email: true },
    });
    if (customer?.email) {
      const email = proposalEmail(booking, parsed.data.slots, proposal.token);
      await sendEmail({ to: customer.email, ...email });
    }
  } catch (error) {
    console.error("[EMAIL] Failed to send proposal email:", error);
  }

  revalidatePath(`/dashboard/technician/bookings/${bookingId}`);
  return { success: true, token: proposal.token };
}

export async function acceptRescheduleProposal(token: string, slotIso: string) {
  const proposal = await prisma.rescheduleProposal.findUnique({
    where: { token },
    include: {
      booking: {
        include: {
          technician: { include: { user: { select: { name: true, email: true } } } },
          customer: { select: { name: true, email: true } },
        },
      },
    },
  });
  if (!proposal) return { error: "This link is no longer valid" };
  if (proposal.status !== "PENDING") return { error: "This offer has already been used or cancelled" };
  if (proposal.expiresAt.getTime() < Date.now()) return { error: "This offer has expired" };

  const offeredSlots: string[] = JSON.parse(proposal.slots);
  if (!offeredSlots.includes(slotIso)) return { error: "That time wasn't one of the offered options" };

  const newStart = new Date(slotIso);
  if (isNaN(newStart.getTime())) return { error: "That time is invalid" };

  const booking = proposal.booking;
  if (!RESCHEDULABLE_STATUSES.includes(booking.status)) {
    return { error: "This booking can no longer be rescheduled" };
  }

  try {
    await assertSlotAvailable(booking, newStart);
  } catch (err) {
    const message = slotErrorMessage(err);
    if (message) return { error: message };
    throw err;
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: booking.id }, data: { scheduledAt: newStart } });
    await tx.rescheduleProposal.update({
      where: { id: proposal.id },
      data: { status: "ACCEPTED", chosenSlot: newStart },
    });
  });

  try {
    if (booking.customer.email) {
      const email = rescheduledNoticeEmail({ ...booking, scheduledAt: newStart });
      await sendEmail({ to: booking.customer.email, ...email });
    }
    if (booking.technician.user.email) {
      const email = proposalAcceptedEmail(
        { ...booking, scheduledAt: newStart },
        booking.customer.name ?? "Your customer"
      );
      await sendEmail({ to: booking.technician.user.email, ...email });
    }
  } catch (error) {
    console.error("[EMAIL] Failed to send acceptance emails:", error);
  }

  revalidatePath(`/dashboard/technician/bookings/${booking.id}`);
  revalidatePath(`/dashboard/customer/bookings/${booking.id}`);
  return { success: true, bookingId: booking.id };
}

"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bookingSchema } from "@/lib/validations/booking";
import { sendEmail } from "@/lib/email";
import { bookingCreatedEmail, bookingReceivedEmail, bookingStatusEmail, bookingCancelledEmail } from "@/lib/emails/booking";

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

  const booking = await prisma.booking.create({
    data: {
      customerId: session.user.id,
      technicianId,
      status: "PENDING",
      scheduledAt: new Date(scheduledAt),
      durationMin,
      totalCents,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 ?? null,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
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

  revalidatePath(`/dashboard/customer/bookings/${bookingId}`);
  revalidatePath(`/dashboard/technician/bookings/${bookingId}`);
  revalidatePath("/dashboard/customer/bookings");
  revalidatePath("/dashboard/technician/bookings");
  return { success: true };
}

export async function getAvailableSlots(technicianId: string, date: string) {
  const dayOfWeek = new Date(date).getDay();

  const slot = await prisma.availabilitySlot.findFirst({
    where: { technicianId, dayOfWeek },
  });

  if (!slot) return [];

  // Get existing bookings for this date
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const existingBookings = await prisma.booking.findMany({
    where: {
      technicianId,
      scheduledAt: { gte: dayStart, lte: dayEnd },
      status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
    },
  });

  // Generate 30-min slots
  const [startH, startM] = slot.startTime.split(":").map(Number);
  const [endH, endM] = slot.endTime.split(":").map(Number);
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;

  const slots: string[] = [];
  for (let m = startMin; m < endMin; m += 30) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const timeStr = `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;

    // Check if this slot overlaps with an existing booking
    const slotTime = new Date(date);
    slotTime.setHours(h, min, 0, 0);

    const isBooked = existingBookings.some((b) => {
      const bookingStart = new Date(b.scheduledAt).getTime();
      const bookingEnd = bookingStart + b.durationMin * 60 * 1000;
      const slotStart = slotTime.getTime();
      const slotEnd = slotStart + 30 * 60 * 1000;
      return slotStart < bookingEnd && slotEnd > bookingStart;
    });

    if (!isBooked) {
      slots.push(timeStr);
    }
  }

  return slots;
}

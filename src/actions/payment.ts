"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { sendEmail } from "@/lib/email";
import { paymentReceiptEmail } from "@/lib/emails/payment";
import { isValidTipCents } from "@/lib/finance/tip";

export async function createCheckoutSession(bookingId: string, tipCents = 0) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, customerId: session.user.id },
    include: {
      services: { include: { service: true } },
      payment: true,
    },
  });

  if (!booking) return { error: "Booking not found" };
  if (booking.payment?.status === "SUCCEEDED") {
    return { error: "Already paid" };
  }
  if (!isValidTipCents(tipCents, booking.totalCents)) {
    return { error: "Invalid tip amount" };
  }

  const lineItems = booking.services.map((bs) => ({
    price_data: {
      currency: "usd",
      product_data: { name: bs.service.name },
      unit_amount: bs.priceCents,
    },
    quantity: 1,
  }));

  if (tipCents > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Tip for your technician" },
        unit_amount: tipCents,
      },
      quantity: 1,
    });
  }

  const checkoutSession = await getStripe().checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    success_url: `${process.env.NEXTAUTH_URL}/dashboard/customer/bookings/${bookingId}?payment=success`,
    cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/customer/bookings/${bookingId}?payment=cancelled`,
    metadata: { bookingId, tipCents: String(tipCents) },
  });

  return { url: checkoutSession.url };
}

export async function markCashPayment(bookingId: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") {
    return { error: "Unauthorized" };
  }

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) return { error: "Profile not found" };

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, technicianId: profile.id },
    include: { payment: true },
  });

  if (!booking) return { error: "Booking not found" };
  if (booking.payment?.status === "SUCCEEDED") {
    return { error: "Already paid" };
  }

  if (booking.payment) {
    await prisma.payment.update({
      where: { id: booking.payment.id },
      data: { status: "SUCCEEDED", method: "CASH" },
    });
  } else {
    await prisma.payment.create({
      data: {
        bookingId,
        amountCents: booking.totalCents,
        status: "SUCCEEDED",
        method: "CASH",
      },
    });
  }

  try {
    const bookingWithDetails = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: { select: { email: true } },
        services: { include: { service: { select: { name: true } } } },
      },
    });
    if (bookingWithDetails?.customer.email) {
      const email = paymentReceiptEmail(
        bookingWithDetails,
        { amountCents: booking.totalCents, method: "CASH" },
        bookingWithDetails.services.map((s) => s.service.name)
      );
      await sendEmail({ to: bookingWithDetails.customer.email, ...email });
    }
  } catch (error) {
    console.error("[EMAIL] Failed to send payment receipt:", error);
  }

  revalidatePath(`/dashboard/technician/bookings/${bookingId}`);
  return { success: true };
}

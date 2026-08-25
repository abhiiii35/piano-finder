import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { sendEmail } from "@/lib/email";
import { paymentReceiptEmail } from "@/lib/emails/payment";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookingId = session.metadata?.bookingId;
    // Tip is a separate Checkout line item; amount_total includes it, so back
    // it out to get the booking's own amount (see createCheckoutSession).
    const tipCents = Number(session.metadata?.tipCents ?? 0) || 0;

    if (bookingId) {
      const amountCents = (session.amount_total ?? 0) - tipCents;
      const existing = await prisma.payment.findUnique({
        where: { bookingId },
      });

      if (existing) {
        await prisma.payment.update({
          where: { bookingId },
          data: {
            status: "SUCCEEDED",
            stripePaymentId: session.payment_intent as string,
            method: "CARD",
            amountCents,
            tipCents,
          },
        });
      } else {
        await prisma.payment.create({
          data: {
            bookingId,
            amountCents,
            status: "SUCCEEDED",
            stripePaymentId: session.payment_intent as string,
            method: "CARD",
            tipCents,
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
            { amountCents: session.amount_total ?? 0, method: "CARD" },
            bookingWithDetails.services.map((s) => s.service.name)
          );
          await sendEmail({ to: bookingWithDetails.customer.email, ...email });
        }
      } catch (error) {
        console.error("[EMAIL] Failed to send payment receipt:", error);
      }
    }
  }

  return Response.json({ received: true });
}

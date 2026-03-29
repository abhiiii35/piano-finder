import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

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

    if (bookingId) {
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
          },
        });
      } else {
        await prisma.payment.create({
          data: {
            bookingId,
            amountCents: session.amount_total ?? 0,
            status: "SUCCEEDED",
            stripePaymentId: session.payment_intent as string,
            method: "CARD",
          },
        });
      }
    }
  }

  return Response.json({ received: true });
}

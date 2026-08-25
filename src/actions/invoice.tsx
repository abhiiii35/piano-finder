"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePDF, type InvoiceData } from "@/components/invoice/invoice-pdf";
import { sendEmail } from "@/lib/email";
import { invoiceEmail } from "@/lib/emails/invoice";

export async function emailInvoice(bookingId: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") {
    return { error: "Unauthorized" };
  }

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!profile) return { error: "Technician profile not found" };

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, technicianId: profile.id },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      services: { include: { service: true } },
      payment: true,
    },
  });
  if (!booking) return { error: "Booking not found" };

  const data: InvoiceData = {
    bookingId: booking.id,
    date: booking.scheduledAt,
    technician: {
      name: profile.user.name ?? "Technician",
      email: profile.user.email ?? "",
      businessName: profile.businessName,
      addressLine1: profile.addressLine1,
      city: profile.city,
      state: profile.state,
      zipCode: profile.zipCode,
      logoUrl: profile.invoiceLogoUrl,
    },
    customer: {
      name: booking.customer.name ?? "Customer",
      email: booking.customer.email ?? "",
      phone: booking.customer.phone,
    },
    services: booking.services.map((bs) => ({
      name: bs.service.name,
      durationMin: bs.service.durationMin,
      priceCents: bs.priceCents,
    })),
    totalCents: booking.totalCents,
    tipCents: booking.payment?.tipCents ?? 0,
    isPaid: booking.payment?.status === "SUCCEEDED",
  };

  const buffer = await renderToBuffer(<InvoicePDF data={data} />);
  const technicianName = profile.businessName || profile.user.name || "your technician";
  const { subject, html } = invoiceEmail(technicianName);

  await sendEmail({
    to: booking.customer.email!,
    subject,
    html,
    attachments: [
      {
        filename: `invoice-${bookingId.slice(0, 8)}.pdf`,
        content: Buffer.from(buffer),
      },
    ],
  });

  return { success: true };
}

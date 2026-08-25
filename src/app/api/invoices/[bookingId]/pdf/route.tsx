import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  InvoicePDF,
  type InvoiceData,
} from "@/components/invoice/invoice-pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId },
    include: {
      technician: {
        include: { user: { select: { name: true, email: true } } },
      },
      customer: { select: { name: true, email: true, phone: true } },
      services: { include: { service: true } },
      payment: true,
    },
  });

  if (!booking) {
    return new Response("Not found", { status: 404 });
  }

  // Must be the technician or the customer
  const isTechnician = booking.technician.userId === session.user.id;
  const isCustomer = booking.customerId === session.user.id;
  if (!isTechnician && !isCustomer) {
    return new Response("Forbidden", { status: 403 });
  }

  const data: InvoiceData = {
    bookingId: booking.id,
    date: booking.scheduledAt,
    technician: {
      name: booking.technician.user.name ?? "Technician",
      email: booking.technician.user.email ?? "",
      businessName: booking.technician.businessName,
      addressLine1: booking.technician.addressLine1,
      city: booking.technician.city,
      state: booking.technician.state,
      zipCode: booking.technician.zipCode,
      logoUrl: booking.technician.invoiceLogoUrl,
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

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${bookingId.slice(0, 8)}.pdf"`,
    },
  });
}

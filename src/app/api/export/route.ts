import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  customersCsv,
  pianosCsv,
  contactsCsv,
  locationsCsv,
  serviceHistoryCsv,
  bookingsCsv,
} from "@/lib/export-csv";

const EXPORT_TYPES = [
  "customers",
  "pianos",
  "contacts",
  "locations",
  "service-history",
  "bookings",
] as const;
type ExportType = (typeof EXPORT_TYPES)[number];

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") {
    return new Response("Unauthorized", { status: 401 });
  }

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) return new Response("Profile not found", { status: 404 });

  const url = new URL(request.url);
  const type = url.searchParams.get("type") as ExportType | null;
  if (!type || !EXPORT_TYPES.includes(type)) {
    return new Response("Invalid export type", { status: 400 });
  }

  let csv: string;
  switch (type) {
    case "customers": {
      const rows = await prisma.customerRecord.findMany({
        where: { technicianId: profile.id },
        orderBy: { createdAt: "asc" },
      });
      csv = customersCsv(rows);
      break;
    }
    case "pianos": {
      const rows = await prisma.piano.findMany({
        where: { customerRecord: { technicianId: profile.id } },
        orderBy: { createdAt: "asc" },
      });
      csv = pianosCsv(rows);
      break;
    }
    case "contacts": {
      const rows = await prisma.contact.findMany({
        where: { customerRecord: { technicianId: profile.id } },
        orderBy: { createdAt: "asc" },
      });
      csv = contactsCsv(rows);
      break;
    }
    case "locations": {
      const rows = await prisma.serviceLocation.findMany({
        where: { customerRecord: { technicianId: profile.id } },
        orderBy: { createdAt: "asc" },
      });
      csv = locationsCsv(rows);
      break;
    }
    case "service-history": {
      const rows = await prisma.serviceRecord.findMany({
        where: { technicianId: profile.id },
        orderBy: { date: "asc" },
      });
      csv = serviceHistoryCsv(rows);
      break;
    }
    case "bookings": {
      const rows = await prisma.booking.findMany({
        where: { technicianId: profile.id },
        include: {
          customer: { select: { name: true, email: true } },
          services: { include: { service: { select: { name: true } } } },
        },
        orderBy: { scheduledAt: "asc" },
      });
      csv = bookingsCsv(
        rows.map((b) => ({
          id: b.id,
          customerId: b.customerId,
          customerName: b.customer.name,
          customerEmail: b.customer.email,
          status: b.status,
          scheduledAt: b.scheduledAt,
          durationMin: b.durationMin,
          addressLine1: b.addressLine1,
          addressLine2: b.addressLine2,
          city: b.city,
          state: b.state,
          zipCode: b.zipCode,
          pianoType: b.pianoType,
          pianoMake: b.pianoMake,
          pianoModel: b.pianoModel,
          notes: b.notes,
          serviceNames: b.services.map((bs) => bs.service.name),
          totalCents: b.totalCents,
          createdAt: b.createdAt,
        }))
      );
      break;
    }
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}.csv"`,
    },
  });
}

"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getTechnicianProfile() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") {
    throw new Error("Unauthorized");
  }
  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) throw new Error("Profile not found");
  return profile;
}

export type SearchResult = {
  type: "customer" | "contact" | "piano" | "location" | "booking";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export type SearchGroups = {
  customers: SearchResult[];
  contacts: SearchResult[];
  pianos: SearchResult[];
  locations: SearchResult[];
  bookings: SearchResult[];
};

const EMPTY_RESULTS: SearchGroups = {
  customers: [],
  contacts: [],
  pianos: [],
  locations: [],
  bookings: [],
};

const RESULT_LIMIT = 5;
const MIN_QUERY_LENGTH = 2;

export async function globalSearch(query: string): Promise<SearchGroups> {
  const profile = await getTechnicianProfile();

  const q = query.trim();
  if (q.length < MIN_QUERY_LENGTH) return EMPTY_RESULTS;

  // Note: SQLite's LIKE (which Prisma's `contains` compiles to on this
  // provider) is case-insensitive for ASCII by default, so no `mode` option
  // is needed here (and SQLite doesn't support Prisma's `mode: "insensitive"`).
  const [customers, contacts, pianos, locations, bookings] = await Promise.all([
    prisma.customerRecord.findMany({
      where: {
        technicianId: profile.id,
        OR: [
          { customerName: { contains: q } },
          { customerEmail: { contains: q } },
          { customerPhone: { contains: q } },
        ],
      },
      take: RESULT_LIMIT,
    }),
    prisma.contact.findMany({
      where: {
        customerRecord: { technicianId: profile.id },
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } },
        ],
      },
      include: { customerRecord: true },
      take: RESULT_LIMIT,
    }),
    prisma.piano.findMany({
      where: {
        customerRecord: { technicianId: profile.id },
        OR: [
          { make: { contains: q } },
          { model: { contains: q } },
          { serialNumber: { contains: q } },
        ],
      },
      include: { customerRecord: true },
      take: RESULT_LIMIT,
    }),
    prisma.serviceLocation.findMany({
      where: {
        customerRecord: { technicianId: profile.id },
        OR: [{ label: { contains: q } }, { city: { contains: q } }],
      },
      include: { customerRecord: true },
      take: RESULT_LIMIT,
    }),
    prisma.booking.findMany({
      where: {
        technicianId: profile.id,
        OR: [{ customer: { name: { contains: q } } }, { city: { contains: q } }],
      },
      include: { customer: true },
      take: RESULT_LIMIT,
    }),
  ]);

  return {
    customers: customers.map((c) => ({
      type: "customer",
      id: c.id,
      title: c.customerName,
      subtitle: c.customerEmail ?? c.customerPhone ?? "",
      href: `/dashboard/technician/customers/${c.id}`,
    })),
    contacts: contacts.map((c) => ({
      type: "contact",
      id: c.id,
      title: c.name,
      subtitle: c.customerRecord.customerName,
      href: `/dashboard/technician/customers/${c.customerRecordId}`,
    })),
    pianos: pianos.map((p) => ({
      type: "piano",
      id: p.id,
      title: [p.make, p.model].filter(Boolean).join(" ") || "Piano",
      subtitle: p.customerRecord.customerName,
      href: `/dashboard/technician/customers/${p.customerRecordId}/pianos/${p.id}`,
    })),
    locations: locations.map((l) => ({
      type: "location",
      id: l.id,
      title: l.label,
      subtitle: l.customerRecord.customerName,
      href: `/dashboard/technician/customers/${l.customerRecordId}`,
    })),
    bookings: bookings.map((b) => ({
      type: "booking",
      id: b.id,
      title: b.customer.name ?? "Booking",
      subtitle: `${b.city}, ${b.state}`,
      href: `/dashboard/technician/bookings/${b.id}`,
    })),
  };
}

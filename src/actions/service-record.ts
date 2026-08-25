"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serviceRecordSchema } from "@/lib/validations/service-record";
import type { HistoryViewPrefs, ClientViewPrefs } from "@/lib/service-history";

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

// A piano belongs to a technician transitively through its CustomerRecord.
async function getOwnedPiano(pianoId: string, technicianId: string) {
  const piano = await prisma.piano.findUnique({
    where: { id: pianoId },
    include: { customerRecord: true },
  });
  if (!piano || piano.customerRecord.technicianId !== technicianId) return null;
  return piano;
}

async function getOwnedServiceRecord(recordId: string, technicianId: string) {
  const record = await prisma.serviceRecord.findUnique({
    where: { id: recordId },
    include: { piano: { include: { customerRecord: true } } },
  });
  if (!record || record.piano.customerRecord.technicianId !== technicianId) return null;
  return record;
}

function pianoPath(customerRecordId: string, pianoId: string) {
  return `/dashboard/technician/customers/${customerRecordId}/pianos/${pianoId}`;
}

export async function createServiceRecord(pianoId: string, formData: FormData) {
  const profile = await getTechnicianProfile();
  const piano = await getOwnedPiano(pianoId, profile.id);
  if (!piano) return { error: "Piano not found" };

  const raw = Object.fromEntries(formData.entries());
  const result = serviceRecordSchema.safeParse(raw);
  if (!result.success) return { error: result.error.issues[0].message };
  const v = result.data;

  await prisma.serviceRecord.create({
    data: {
      pianoId,
      technicianId: profile.id,
      date: v.date,
      workPerformed: v.workPerformed || null,
      pitchOffsetCents: v.pitchOffsetCents ?? null,
      humidityPct: v.humidityPct ?? null,
      temperatureF: v.temperatureF ?? null,
      recommendations: v.recommendations || null,
      notes: v.notes || null,
      photos: JSON.stringify(v.photosJson),
      source: "MANUAL",
      clientVisible: !v.hideFromClient,
    },
  });

  revalidatePath(pianoPath(piano.customerRecordId, pianoId));
  return { success: true };
}

export async function updateServiceRecord(recordId: string, formData: FormData) {
  const profile = await getTechnicianProfile();
  const existing = await getOwnedServiceRecord(recordId, profile.id);
  if (!existing) return { error: "Record not found" };

  const raw = Object.fromEntries(formData.entries());
  const result = serviceRecordSchema.safeParse(raw);
  if (!result.success) return { error: result.error.issues[0].message };
  const v = result.data;

  await prisma.serviceRecord.update({
    where: { id: recordId },
    data: {
      date: v.date,
      workPerformed: v.workPerformed || null,
      pitchOffsetCents: v.pitchOffsetCents ?? null,
      humidityPct: v.humidityPct ?? null,
      temperatureF: v.temperatureF ?? null,
      recommendations: v.recommendations || null,
      notes: v.notes || null,
      photos: JSON.stringify(v.photosJson),
      clientVisible: !v.hideFromClient,
    },
  });

  revalidatePath(pianoPath(existing.piano.customerRecordId, existing.pianoId));
  return { success: true };
}

export async function deleteServiceRecord(recordId: string) {
  const profile = await getTechnicianProfile();
  const existing = await getOwnedServiceRecord(recordId, profile.id);
  if (!existing) return { error: "Record not found" };

  await prisma.serviceRecord.delete({ where: { id: recordId } });

  revalidatePath(pianoPath(existing.piano.customerRecordId, existing.pianoId));
  return { success: true };
}

// Builds a PLATFORM-source ServiceRecord from a completed booking. Export
// only — the orchestrator wires this into booking completion later
// (src/actions/booking.ts updateBookingStatus), it is not called anywhere yet.
export async function createServiceRecordFromBooking(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: { select: { name: true, email: true } },
      services: { include: { service: { select: { name: true } } } },
    },
  });
  if (!booking || booking.status !== "COMPLETED" || !booking.customer.email) return;

  // Idempotent: don't double-create if this booking already has a record.
  const existingRecord = await prisma.serviceRecord.findFirst({ where: { bookingId } });
  if (existingRecord) return;

  const customerRecord = await prisma.customerRecord.upsert({
    where: {
      technicianId_customerEmail: {
        technicianId: booking.technicianId,
        customerEmail: booking.customer.email,
      },
    },
    update: {},
    create: {
      technicianId: booking.technicianId,
      customerName: booking.customer.name ?? "Customer",
      customerEmail: booking.customer.email,
    },
  });

  // Booking only records pianoType/pianoMake/pianoModel (no serial number), so
  // matching is by make+model when the customer gave either; otherwise reuse
  // the customer's sole existing piano rather than spawning a duplicate blank
  // entry every booking.
  // ponytail: no serial matching (Booking has no serialNumber field) and no
  // fuzzy/partial matching — upgrade if bookings start collecting serials.
  let piano = null;
  if (booking.pianoMake || booking.pianoModel) {
    piano = await prisma.piano.findFirst({
      where: {
        customerRecordId: customerRecord.id,
        ...(booking.pianoMake ? { make: booking.pianoMake } : {}),
        ...(booking.pianoModel ? { model: booking.pianoModel } : {}),
      },
    });
  } else {
    const existingPianos = await prisma.piano.findMany({
      where: { customerRecordId: customerRecord.id },
      take: 2,
    });
    if (existingPianos.length === 1) piano = existingPianos[0];
  }

  if (!piano) {
    piano = await prisma.piano.create({
      data: {
        customerRecordId: customerRecord.id,
        type: booking.pianoType ?? null,
        make: booking.pianoMake ?? null,
        model: booking.pianoModel ?? null,
      },
    });
  }

  const workPerformed = booking.services.map((bs) => bs.service.name).join(", ") || null;

  await prisma.serviceRecord.create({
    data: {
      pianoId: piano.id,
      technicianId: booking.technicianId,
      bookingId: booking.id,
      date: booking.scheduledAt,
      workPerformed,
      source: "PLATFORM",
      clientVisible: true,
    },
  });
}

// ─── View preferences (settings/history page) ───────────────────

const historyViewPrefsSchema = z.object({
  order: z.enum(["newest", "oldest"]),
  show: z.object({
    readings: z.boolean(),
    photos: z.boolean(),
    recommendations: z.boolean(),
    internalNotes: z.boolean(),
  }),
  quickLogPresets: z.array(z.string().trim().min(1)).max(20),
});

const clientViewPrefsSchema = z.object({
  show: z.object({
    readings: z.boolean(),
    photos: z.boolean(),
    recommendations: z.boolean(),
    workPerformed: z.boolean(),
    prices: z.boolean(),
  }),
});

const SETTINGS_PATH = "/dashboard/technician/settings/history";

export async function saveHistoryViewPrefs(prefs: HistoryViewPrefs) {
  const profile = await getTechnicianProfile();
  const result = historyViewPrefsSchema.safeParse(prefs);
  if (!result.success) return { error: result.error.issues[0].message };

  await prisma.technicianProfile.update({
    where: { id: profile.id },
    data: { historyViewPrefs: JSON.stringify(result.data) },
  });
  revalidatePath(SETTINGS_PATH);
  return { success: true };
}

export async function saveClientViewPrefs(prefs: ClientViewPrefs) {
  const profile = await getTechnicianProfile();
  const result = clientViewPrefsSchema.safeParse(prefs);
  if (!result.success) return { error: result.error.issues[0].message };

  await prisma.technicianProfile.update({
    where: { id: profile.id },
    data: { clientViewPrefs: JSON.stringify(result.data) },
  });
  revalidatePath(SETTINGS_PATH);
  return { success: true };
}

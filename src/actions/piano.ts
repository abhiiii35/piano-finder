"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pianoSchema } from "@/lib/validations/piano";

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

// Confirms serviceLocationId (if provided) belongs to the same customer record,
// preventing a piano from being linked to another customer's location.
async function assertServiceLocationBelongs(
  serviceLocationId: string | undefined,
  customerRecordId: string
) {
  if (!serviceLocationId) return;
  const location = await prisma.serviceLocation.findFirst({
    where: { id: serviceLocationId, customerRecordId },
  });
  if (!location) throw new Error("Service location not found");
}

export async function createPiano(customerRecordId: string, formData: FormData) {
  const profile = await getTechnicianProfile();

  const record = await prisma.customerRecord.findFirst({
    where: { id: customerRecordId, technicianId: profile.id },
  });
  if (!record) return { error: "Customer record not found" };

  const raw = Object.fromEntries(formData.entries());
  const result = pianoSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }
  const v = result.data;

  try {
    await assertServiceLocationBelongs(v.serviceLocationId, customerRecordId);
  } catch (err) {
    return { error: (err as Error).message };
  }

  const piano = await prisma.piano.create({
    data: {
      customerRecordId,
      serviceLocationId: v.serviceLocationId || null,
      type: v.type || null,
      make: v.make || null,
      model: v.model || null,
      serialNumber: v.serialNumber || null,
      year: v.year ?? null,
      roomLocation: v.roomLocation || null,
      tuningFrequencyMonths: v.tuningFrequencyMonths,
      damppChaserInstalled: v.damppChaserInstalled,
      notes: v.notes || null,
    },
  });

  revalidatePath(`/dashboard/technician/customers/${customerRecordId}`);
  return { success: true, piano };
}

export async function updatePiano(pianoId: string, formData: FormData) {
  const profile = await getTechnicianProfile();

  const existing = await prisma.piano.findFirst({
    where: { id: pianoId, customerRecord: { technicianId: profile.id } },
  });
  if (!existing) return { error: "Piano not found" };

  const raw = Object.fromEntries(formData.entries());
  const result = pianoSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }
  const v = result.data;

  try {
    await assertServiceLocationBelongs(v.serviceLocationId, existing.customerRecordId);
  } catch (err) {
    return { error: (err as Error).message };
  }

  await prisma.piano.update({
    where: { id: pianoId },
    data: {
      serviceLocationId: v.serviceLocationId || null,
      type: v.type || null,
      make: v.make || null,
      model: v.model || null,
      serialNumber: v.serialNumber || null,
      year: v.year ?? null,
      roomLocation: v.roomLocation || null,
      tuningFrequencyMonths: v.tuningFrequencyMonths,
      damppChaserInstalled: v.damppChaserInstalled,
      notes: v.notes || null,
    },
  });

  revalidatePath(`/dashboard/technician/customers/${existing.customerRecordId}`);
  revalidatePath(
    `/dashboard/technician/customers/${existing.customerRecordId}/pianos/${pianoId}`
  );
  return { success: true };
}

export async function deletePiano(pianoId: string) {
  const profile = await getTechnicianProfile();

  const existing = await prisma.piano.findFirst({
    where: { id: pianoId, customerRecord: { technicianId: profile.id } },
  });
  if (!existing) return { error: "Piano not found" };

  await prisma.piano.delete({ where: { id: pianoId } });

  revalidatePath(`/dashboard/technician/customers/${existing.customerRecordId}`);
  return { success: true };
}

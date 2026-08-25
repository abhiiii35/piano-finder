"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serviceLocationSchema } from "@/lib/validations/service-location";

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

export async function createServiceLocation(
  customerRecordId: string,
  formData: FormData
) {
  const profile = await getTechnicianProfile();

  const record = await prisma.customerRecord.findFirst({
    where: { id: customerRecordId, technicianId: profile.id },
  });
  if (!record) return { error: "Customer record not found" };

  const raw = Object.fromEntries(formData.entries());
  const result = serviceLocationSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }
  const v = result.data;

  const location = await prisma.$transaction(async (tx) => {
    // Exactly one primary location per customer record: clear any existing
    // primary before creating this one, in the same transaction.
    if (v.isPrimary) {
      await tx.serviceLocation.updateMany({
        where: { customerRecordId, isPrimary: true },
        data: { isPrimary: false },
      });
    }
    return tx.serviceLocation.create({
      data: {
        customerRecordId,
        label: v.label,
        addressLine1: v.addressLine1 || null,
        city: v.city || null,
        state: v.state || null,
        zipCode: v.zipCode || null,
        isPrimary: v.isPrimary,
      },
    });
  });

  revalidatePath(`/dashboard/technician/customers/${customerRecordId}`);
  return { success: true, location };
}

export async function updateServiceLocation(
  locationId: string,
  formData: FormData
) {
  const profile = await getTechnicianProfile();

  const existing = await prisma.serviceLocation.findFirst({
    where: { id: locationId, customerRecord: { technicianId: profile.id } },
  });
  if (!existing) return { error: "Service location not found" };

  const raw = Object.fromEntries(formData.entries());
  const result = serviceLocationSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }
  const v = result.data;

  await prisma.$transaction(async (tx) => {
    if (v.isPrimary) {
      await tx.serviceLocation.updateMany({
        where: {
          customerRecordId: existing.customerRecordId,
          isPrimary: true,
          NOT: { id: locationId },
        },
        data: { isPrimary: false },
      });
    }
    await tx.serviceLocation.update({
      where: { id: locationId },
      data: {
        label: v.label,
        addressLine1: v.addressLine1 || null,
        city: v.city || null,
        state: v.state || null,
        zipCode: v.zipCode || null,
        isPrimary: v.isPrimary,
      },
    });
  });

  revalidatePath(`/dashboard/technician/customers/${existing.customerRecordId}`);
  return { success: true };
}

export async function deleteServiceLocation(locationId: string) {
  const profile = await getTechnicianProfile();

  const existing = await prisma.serviceLocation.findFirst({
    where: { id: locationId, customerRecord: { technicianId: profile.id } },
  });
  if (!existing) return { error: "Service location not found" };

  // Pianos referencing this location have serviceLocationId SET NULL on delete
  // (see Piano_serviceLocationId_fkey), so this is always safe.
  await prisma.serviceLocation.delete({ where: { id: locationId } });

  revalidatePath(`/dashboard/technician/customers/${existing.customerRecordId}`);
  return { success: true };
}

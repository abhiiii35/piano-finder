"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerRecordSchema } from "@/lib/validations/customer-record";

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

export async function createCustomerRecord(formData: FormData) {
  const profile = await getTechnicianProfile();

  const raw = Object.fromEntries(formData.entries());
  const result = customerRecordSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  await prisma.customerRecord.create({
    data: {
      technicianId: profile.id,
      ...result.data,
      customerEmail: result.data.customerEmail || null,
      customerPhone: result.data.customerPhone || null,
      pianoMake: result.data.pianoMake || null,
      pianoModel: result.data.pianoModel || null,
      serialNumber: result.data.serialNumber || null,
      pianoLocation: result.data.pianoLocation || null,
      notes: result.data.notes || null,
    },
  });

  revalidatePath("/dashboard/technician/customers");
  return { success: true };
}

export async function updateCustomerRecord(
  recordId: string,
  formData: FormData
) {
  const profile = await getTechnicianProfile();

  const existing = await prisma.customerRecord.findFirst({
    where: { id: recordId, technicianId: profile.id },
  });
  if (!existing) return { error: "Record not found" };

  const raw = Object.fromEntries(formData.entries());
  const result = customerRecordSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  await prisma.customerRecord.update({
    where: { id: recordId },
    data: {
      ...result.data,
      customerEmail: result.data.customerEmail || null,
      customerPhone: result.data.customerPhone || null,
      pianoMake: result.data.pianoMake || null,
      pianoModel: result.data.pianoModel || null,
      serialNumber: result.data.serialNumber || null,
      pianoLocation: result.data.pianoLocation || null,
      notes: result.data.notes || null,
      billingAddressLine1: result.data.billingAddressLine1 || null,
      billingCity: result.data.billingCity || null,
      billingState: result.data.billingState || null,
      billingZip: result.data.billingZip || null,
    },
  });

  revalidatePath(`/dashboard/technician/customers/${recordId}`);
  revalidatePath("/dashboard/technician/customers");
  return { success: true };
}

export async function deleteCustomerRecord(recordId: string) {
  const profile = await getTechnicianProfile();

  await prisma.customerRecord.deleteMany({
    where: { id: recordId, technicianId: profile.id },
  });

  revalidatePath("/dashboard/technician/customers");
  return { success: true };
}

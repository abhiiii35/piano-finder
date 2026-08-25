"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validations/contact";

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

export async function createContact(customerRecordId: string, formData: FormData) {
  const profile = await getTechnicianProfile();

  const record = await prisma.customerRecord.findFirst({
    where: { id: customerRecordId, technicianId: profile.id },
  });
  if (!record) return { error: "Customer record not found" };

  const raw = Object.fromEntries(formData.entries());
  const result = contactSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }
  const v = result.data;

  const contact = await prisma.$transaction(async (tx) => {
    // Exactly one primary contact per customer record: clear any existing
    // primary before creating this one, in the same transaction.
    if (v.isPrimary) {
      await tx.contact.updateMany({
        where: { customerRecordId, isPrimary: true },
        data: { isPrimary: false },
      });
    }
    return tx.contact.create({
      data: {
        customerRecordId,
        name: v.name,
        email: v.email || null,
        phone: v.phone || null,
        role: v.role || null,
        isPrimary: v.isPrimary,
      },
    });
  });

  revalidatePath(`/dashboard/technician/customers/${customerRecordId}`);
  return { success: true, contact };
}

export async function updateContact(contactId: string, formData: FormData) {
  const profile = await getTechnicianProfile();

  const existing = await prisma.contact.findFirst({
    where: { id: contactId, customerRecord: { technicianId: profile.id } },
  });
  if (!existing) return { error: "Contact not found" };

  const raw = Object.fromEntries(formData.entries());
  const result = contactSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }
  const v = result.data;

  await prisma.$transaction(async (tx) => {
    if (v.isPrimary) {
      await tx.contact.updateMany({
        where: {
          customerRecordId: existing.customerRecordId,
          isPrimary: true,
          NOT: { id: contactId },
        },
        data: { isPrimary: false },
      });
    }
    await tx.contact.update({
      where: { id: contactId },
      data: {
        name: v.name,
        email: v.email || null,
        phone: v.phone || null,
        role: v.role || null,
        isPrimary: v.isPrimary,
      },
    });
  });

  revalidatePath(`/dashboard/technician/customers/${existing.customerRecordId}`);
  return { success: true };
}

export async function deleteContact(contactId: string) {
  const profile = await getTechnicianProfile();

  const existing = await prisma.contact.findFirst({
    where: { id: contactId, customerRecord: { technicianId: profile.id } },
  });
  if (!existing) return { error: "Contact not found" };

  await prisma.contact.delete({ where: { id: contactId } });

  revalidatePath(`/dashboard/technician/customers/${existing.customerRecordId}`);
  return { success: true };
}

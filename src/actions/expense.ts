"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { expenseSchema, mileageLogSchema } from "@/lib/validations/expense";

const FINANCES_PATH = "/dashboard/technician/finances";

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

export async function createExpense(formData: FormData) {
  const profile = await getTechnicianProfile();

  const raw = Object.fromEntries(formData.entries());
  const result = expenseSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  await prisma.expense.create({
    data: {
      technicianId: profile.id,
      date: result.data.date,
      category: result.data.category,
      amountCents: result.data.amountCents,
      vendor: result.data.vendor || null,
      notes: result.data.notes || null,
      receiptUrl: result.data.receiptUrl || null,
      deductible: result.data.deductible,
    },
  });

  revalidatePath(FINANCES_PATH);
  return { success: true };
}

export async function deleteExpense(expenseId: string) {
  const profile = await getTechnicianProfile();

  await prisma.expense.deleteMany({
    where: { id: expenseId, technicianId: profile.id },
  });

  revalidatePath(FINANCES_PATH);
  return { success: true };
}

export async function createMileageLog(formData: FormData) {
  const profile = await getTechnicianProfile();

  const raw = Object.fromEntries(formData.entries());
  const result = mileageLogSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const bookingId = result.data.bookingId || null;
  if (bookingId) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, technicianId: profile.id },
    });
    if (!booking) return { error: "Booking not found" };
  }

  await prisma.mileageLog.create({
    data: {
      technicianId: profile.id,
      date: result.data.date,
      miles: result.data.miles,
      purpose: result.data.purpose,
      bookingId,
    },
  });

  revalidatePath(FINANCES_PATH);
  return { success: true };
}

export async function deleteMileageLog(mileageLogId: string) {
  const profile = await getTechnicianProfile();

  await prisma.mileageLog.deleteMany({
    where: { id: mileageLogId, technicianId: profile.id },
  });

  revalidatePath(FINANCES_PATH);
  return { success: true };
}

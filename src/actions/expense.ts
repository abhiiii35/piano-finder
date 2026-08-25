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

export async function updateMileageLog(
  mileageLogId: string,
  updates: { date?: string; miles?: string; purpose?: string }
) {
  const profile = await getTechnicianProfile();

  // Build update object from non-empty fields
  const updateData: { date?: Date; miles?: number; purpose?: string } = {};

  if (updates.date) {
    const result = mileageLogSchema.pick({ date: true }).safeParse({ date: updates.date });
    if (!result.success) {
      return { error: result.error.issues[0].message };
    }
    updateData.date = result.data.date;
  }

  if (updates.miles) {
    const result = mileageLogSchema.pick({ miles: true }).safeParse({ miles: updates.miles });
    if (!result.success) {
      return { error: result.error.issues[0].message };
    }
    updateData.miles = result.data.miles;
  }

  if (updates.purpose) {
    const result = mileageLogSchema.pick({ purpose: true }).safeParse({ purpose: updates.purpose });
    if (!result.success) {
      return { error: result.error.issues[0].message };
    }
    updateData.purpose = result.data.purpose;
  }

  if (Object.keys(updateData).length === 0) {
    return { success: true }; // no-op if no valid updates
  }

  // Verify ownership and update
  const log = await prisma.mileageLog.findUnique({
    where: { id: mileageLogId },
  });

  if (!log || log.technicianId !== profile.id) {
    return { error: "Mileage log not found" };
  }

  await prisma.mileageLog.update({
    where: { id: mileageLogId },
    data: updateData,
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

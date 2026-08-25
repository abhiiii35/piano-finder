"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { availabilityExceptionSchema } from "@/lib/validations/availability-exception";

async function getTechnicianProfile() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") {
    throw new Error("Unauthorized");
  }
  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) throw new Error("Profile not found");
  return { session, profile };
}

// "yyyy-mm-dd" + "HH:mm" as a LOCAL date — same convention as parseLocalDate in booking.ts
function localDateTime(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

export async function createAvailabilityException(input: {
  date: string;
  allDay: boolean;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
}) {
  const { profile } = await getTechnicianProfile();

  const result = availabilityExceptionSchema.safeParse(input);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }
  const v = result.data;

  const startsAt = v.allDay
    ? localDateTime(v.date, "00:00")
    : localDateTime(v.date, v.startTime!);
  // all-day endDate is inclusive: block runs to midnight after its last day
  const endsAt = v.allDay
    ? new Date(
        localDateTime(v.endDate ?? v.date, "00:00").getTime() +
          24 * 60 * 60 * 1000
      )
    : localDateTime(v.date, v.endTime!);

  const exception = await prisma.availabilityException.create({
    data: {
      technicianId: profile.id,
      startsAt,
      endsAt,
      allDay: v.allDay,
      reason: v.reason || null,
    },
  });

  revalidatePath("/dashboard/technician/availability");
  return { exception };
}

export async function deleteAvailabilityException(id: string) {
  const { profile } = await getTechnicianProfile();

  const exception = await prisma.availabilityException.findUnique({
    where: { id },
  });
  if (!exception || exception.technicianId !== profile.id) {
    return { error: "Time off entry not found" };
  }

  await prisma.availabilityException.delete({ where: { id } });
  revalidatePath("/dashboard/technician/availability");
  return { success: true };
}

export async function listAvailabilityExceptions() {
  const { profile } = await getTechnicianProfile();
  return prisma.availabilityException.findMany({
    where: { technicianId: profile.id, endsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
  });
}

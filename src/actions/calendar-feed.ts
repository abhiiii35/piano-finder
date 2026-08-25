"use server";

import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getOwnedProfile() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") {
    return { error: "Please sign in as a technician" as const };
  }
  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) return { error: "Profile not found" as const };
  return { profile };
}

function newToken(): string {
  // 24 bytes hex = 48 chars, unguessable; collision odds are negligible so no
  // retry loop (ponytail: add a retry-on-unique-violation if this ever fires).
  return randomBytes(24).toString("hex");
}

export async function getCalendarFeedStatus() {
  const result = await getOwnedProfile();
  if ("error" in result) return { error: result.error };
  return { calendarToken: result.profile.calendarToken };
}

export async function enableCalendarFeed() {
  const result = await getOwnedProfile();
  if ("error" in result) return { error: result.error };
  if (result.profile.calendarToken) {
    return { success: true as const, calendarToken: result.profile.calendarToken };
  }

  const calendarToken = newToken();
  await prisma.technicianProfile.update({
    where: { id: result.profile.id },
    data: { calendarToken },
  });

  revalidatePath("/dashboard/technician/availability");
  return { success: true as const, calendarToken };
}

export async function regenerateCalendarFeed() {
  const result = await getOwnedProfile();
  if ("error" in result) return { error: result.error };

  const calendarToken = newToken();
  await prisma.technicianProfile.update({
    where: { id: result.profile.id },
    data: { calendarToken },
  });

  revalidatePath("/dashboard/technician/availability");
  return { success: true as const, calendarToken };
}

export async function disableCalendarFeed() {
  const result = await getOwnedProfile();
  if ("error" in result) return { error: result.error };

  await prisma.technicianProfile.update({
    where: { id: result.profile.id },
    data: { calendarToken: null },
  });

  revalidatePath("/dashboard/technician/availability");
  return { success: true as const };
}

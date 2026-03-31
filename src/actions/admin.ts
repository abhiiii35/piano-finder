"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { ROLES, ONBOARDING_STATUS } from "@/lib/constants";
import { profileApprovedEmail, profileRejectedEmail } from "@/lib/emails/onboarding";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== ROLES.ADMIN) {
    return { error: "Unauthorized" as const };
  }
  return { session };
}

export async function getPendingSubmissions() {
  const result = await requireAdmin();
  if ("error" in result) return { error: result.error };

  const submissions = await prisma.technicianProfile.findMany({
    where: { onboardingStatus: ONBOARDING_STATUS.SUBMITTED },
    include: { user: { select: { name: true, email: true } }, services: true },
    orderBy: { updatedAt: "asc" },
  });

  return { submissions };
}

export async function approveSubmission(profileId: string) {
  const result = await requireAdmin();
  if ("error" in result) return { error: result.error };

  const profile = await prisma.technicianProfile.findUnique({
    where: { id: profileId },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!profile) return { error: "Profile not found" };
  if (profile.onboardingStatus !== ONBOARDING_STATUS.SUBMITTED) {
    return { error: "Profile is not pending review" };
  }

  await prisma.technicianProfile.update({
    where: { id: profileId },
    data: {
      isActive: true,
      isVerified: true,
      onboardingStatus: ONBOARDING_STATUS.APPROVED,
    },
  });

  const email = profileApprovedEmail(profile.user.name ?? "Technician");
  await sendEmail({ to: profile.user.email, subject: email.subject, html: email.html });

  revalidatePath("/dashboard/admin/submissions");
  return { success: true };
}

export async function rejectSubmission(profileId: string, reason: string) {
  const result = await requireAdmin();
  if ("error" in result) return { error: result.error };

  if (!reason.trim()) return { error: "A reason is required" };

  const profile = await prisma.technicianProfile.findUnique({
    where: { id: profileId },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!profile) return { error: "Profile not found" };
  if (profile.onboardingStatus !== ONBOARDING_STATUS.SUBMITTED) {
    return { error: "Profile is not pending review" };
  }

  await prisma.technicianProfile.update({
    where: { id: profileId },
    data: {
      onboardingStatus: ONBOARDING_STATUS.REJECTED,
      rejectionReason: reason,
    },
  });

  const email = profileRejectedEmail(profile.user.name ?? "Technician", reason);
  await sendEmail({ to: profile.user.email, subject: email.subject, html: email.html });

  revalidatePath("/dashboard/admin/submissions");
  return { success: true };
}

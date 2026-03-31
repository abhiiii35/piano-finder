"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ONBOARDING_STATUS } from "@/lib/constants";
import { wizardProfileSchema } from "@/lib/validations/onboarding";

async function getOnboardingProfile() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") {
    return { error: "Unauthorized" as const };
  }
  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) return { error: "Profile not found" as const };
  return { session, profile };
}

export async function completeWizard(formData: FormData) {
  const result = await getOnboardingProfile();
  if ("error" in result) return { error: result.error };
  const { profile } = result;

  if (profile.onboardingStatus !== ONBOARDING_STATUS.WIZARD_PENDING) {
    return { error: "Wizard already completed" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = wizardProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await prisma.technicianProfile.update({
    where: { id: profile.id },
    data: {
      bio: parsed.data.bio,
      businessName: parsed.data.businessName || null,
      yearsExperience: parsed.data.yearsExperience,
      onboardingStatus: ONBOARDING_STATUS.CHECKLIST_PENDING,
    },
  });

  revalidatePath("/dashboard/technician");
  return { success: true };
}

export async function submitForReview() {
  const result = await getOnboardingProfile();
  if ("error" in result) return { error: result.error };
  const { profile } = result;

  const allowed = [ONBOARDING_STATUS.CHECKLIST_PENDING, ONBOARDING_STATUS.REJECTED];
  if (!allowed.includes(profile.onboardingStatus)) {
    return { error: "Cannot submit from current status" };
  }

  const data: { onboardingStatus: string; rejectionReason?: null } = {
    onboardingStatus: ONBOARDING_STATUS.SUBMITTED,
  };
  if (profile.onboardingStatus === ONBOARDING_STATUS.REJECTED) {
    data.rejectionReason = null;
  }

  await prisma.technicianProfile.update({
    where: { id: profile.id },
    data,
  });

  revalidatePath("/dashboard/technician");
  return { success: true };
}

"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { ROLES, ONBOARDING_STATUS } from "@/lib/constants";
import { profileApprovedEmail, profileRejectedEmail } from "@/lib/emails/onboarding";
import { requestPasswordReset, resendVerification } from "@/actions/auth";

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

type UserFilters = {
  q?: string;
  role?: "TECHNICIAN" | "CUSTOMER";
  status?: "ACTIVE" | "SUSPENDED" | "PENDING";
};

export async function getUsers(filters: UserFilters) {
  const result = await requireAdmin();
  if ("error" in result) return { error: result.error };

  const where: Record<string, unknown> = { role: { not: ROLES.ADMIN } };
  if (filters.role) where.role = filters.role;
  if (filters.q) {
    // SQLite LIKE is case-insensitive for ASCII
    where.OR = [
      { name: { contains: filters.q } },
      { email: { contains: filters.q } },
    ];
  }
  if (filters.status === "SUSPENDED") where.suspendedAt = { not: null };
  if (filters.status === "ACTIVE") where.suspendedAt = null;
  if (filters.status === "PENDING") {
    where.role = ROLES.TECHNICIAN;
    where.technician = {
      onboardingStatus: { not: ONBOARDING_STATUS.APPROVED },
    };
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      suspendedAt: true,
      emailVerified: true,
      technician: { select: { onboardingStatus: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200, // ponytail: flat cap, add pagination when the user base outgrows it
  });

  return { users };
}

export async function getUserDetail(id: string) {
  const result = await requireAdmin();
  if ("error" in result) return { error: result.error };

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      technician: {
        include: {
          services: true,
          availabilitySlots: { orderBy: { dayOfWeek: "asc" } },
        },
      },
    },
  });
  if (!user) return { error: "User not found" };

  const isTechnician = user.role === ROLES.TECHNICIAN && user.technician;

  const bookings = await prisma.booking.findMany({
    where: isTechnician
      ? { technicianId: user.technician!.id }
      : { customerId: user.id },
    include: {
      payment: { select: { status: true } },
      customer: { select: { name: true, email: true } },
      technician: { include: { user: { select: { name: true } } } },
    },
    orderBy: { scheduledAt: "desc" },
    take: 10,
  });

  const reviews = isTechnician
    ? await prisma.review.findMany({
        where: { booking: { technicianId: user.technician!.id } },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
    : await prisma.review.findMany({
        where: { authorId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

  const { hashedPassword: _hashedPassword, ...safeUser } = user;
  return { user: safeUser, bookings, reviews };
}

async function loadSuspendTarget(id: string, sessionUserId: string) {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { error: "User not found" as const };
  if (target.id === sessionUserId) {
    return { error: "You can't suspend your own account" as const };
  }
  if (target.role === ROLES.ADMIN) {
    return { error: "Admin accounts can't be suspended" as const };
  }
  return { target };
}

export async function suspendUser(id: string) {
  const result = await requireAdmin();
  if ("error" in result) return { error: result.error };

  const check = await loadSuspendTarget(id, result.session.user.id);
  if ("error" in check) return { error: check.error };

  await prisma.user.update({ where: { id }, data: { suspendedAt: new Date() } });
  revalidatePath("/search");
  revalidatePath("/dashboard/admin/users");
  return { success: true as const };
}

export async function reactivateUser(id: string) {
  const result = await requireAdmin();
  if ("error" in result) return { error: result.error };

  const check = await loadSuspendTarget(id, result.session.user.id);
  if ("error" in check) return { error: check.error };

  await prisma.user.update({ where: { id }, data: { suspendedAt: null } });
  revalidatePath("/search");
  revalidatePath("/dashboard/admin/users");
  return { success: true as const };
}

export async function adminResendVerification(id: string) {
  const result = await requireAdmin();
  if ("error" in result) return { error: result.error };

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { error: "User not found" };

  return resendVerification(user.email);
}

export async function adminSendPasswordReset(id: string) {
  const result = await requireAdmin();
  if ("error" in result) return { error: result.error };

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { error: "User not found" };

  return requestPasswordReset(user.email);
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

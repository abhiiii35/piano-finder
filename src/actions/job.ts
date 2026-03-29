"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { toCents } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { jobSchema } from "@/lib/validations/job";

export async function createJob(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Please sign in to post a job" };

  const raw = Object.fromEntries(formData.entries());
  const result = jobSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { title, serviceType, description, budget, city, state } = result.data;

  const job = await prisma.job.create({
    data: {
      customerId: session.user.id,
      title,
      serviceType,
      description,
      budgetCents: toCents(budget),
      city,
      state,
    },
  });

  revalidatePath("/jobs");
  return { success: true, jobId: job.id };
}

export async function applyToJob(jobId: string, message?: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") {
    return { error: "Only technicians can apply" };
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.status !== "OPEN") {
    return { error: "Job not found or closed" };
  }

  const existing = await prisma.jobApplication.findFirst({
    where: { jobId, techId: session.user.id },
  });
  if (existing) return { error: "You already applied" };

  await prisma.jobApplication.create({
    data: {
      jobId,
      techId: session.user.id,
      message: message || null,
    },
  });

  revalidatePath("/jobs");
  return { success: true };
}

export async function closeJob(jobId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  const job = await prisma.job.findFirst({
    where: { id: jobId, customerId: session.user.id },
  });
  if (!job) return { error: "Job not found" };

  await prisma.job.update({
    where: { id: jobId },
    data: { status: "CLOSED" },
  });

  revalidatePath("/jobs");
  return { success: true };
}

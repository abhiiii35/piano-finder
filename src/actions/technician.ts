"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCents } from "@/lib/utils";
import { geocode } from "@/lib/geocoding";
import {
  profileSchema,
  serviceSchema,
  availabilitySchema,
} from "@/lib/validations/technician";

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

export async function updateProfile(formData: FormData) {
  const { session, profile } = await getTechnicianProfile();

  const raw = Object.fromEntries(formData.entries());
  const result = profileSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const data = result.data;

  let latitude: number | null = null;
  let longitude: number | null = null;
  if (data.city && data.state) {
    const geo = await geocode(`${data.city}, ${data.state} ${data.zipCode ?? ""}`);
    if (geo) {
      latitude = geo.lat;
      longitude = geo.lng;
    }
  }

  const portfolioPhotos = formData.get("portfolioPhotos") as string | null;

  await prisma.technicianProfile.update({
    where: { id: profile.id },
    data: {
      bio: data.bio ?? null,
      businessName: data.businessName ?? null,
      yearsExperience: data.yearsExperience ?? null,
      certifications: data.certifications ?? null,
      serviceRadius: data.serviceRadius ?? null,
      addressLine1: data.addressLine1 ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      zipCode: data.zipCode ?? null,
      latitude,
      longitude,
      ...(portfolioPhotos !== null && { portfolioPhotos }),
    },
  });

  if (data.phone) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { phone: data.phone },
    });
  }

  revalidatePath("/dashboard/technician/profile");
  return { success: true };
}

export async function createService(formData: FormData) {
  const { profile } = await getTechnicianProfile();

  const raw = Object.fromEntries(formData.entries());
  const result = serviceSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  await prisma.service.create({
    data: {
      technicianId: profile.id,
      name: result.data.name,
      description: result.data.description ?? null,
      priceCents: toCents(result.data.price),
      durationMin: result.data.durationMin,
    },
  });

  revalidatePath("/dashboard/technician/services");
  return { success: true };
}

export async function updateService(serviceId: string, formData: FormData) {
  const { profile } = await getTechnicianProfile();

  const service = await prisma.service.findFirst({
    where: { id: serviceId, technicianId: profile.id },
  });
  if (!service) return { error: "Service not found" };

  const raw = Object.fromEntries(formData.entries());
  const result = serviceSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  await prisma.service.update({
    where: { id: serviceId },
    data: {
      name: result.data.name,
      description: result.data.description ?? null,
      priceCents: toCents(result.data.price),
      durationMin: result.data.durationMin,
    },
  });

  revalidatePath("/dashboard/technician/services");
  return { success: true };
}

export async function deleteService(serviceId: string) {
  const { profile } = await getTechnicianProfile();

  await prisma.service.deleteMany({
    where: { id: serviceId, technicianId: profile.id },
  });

  revalidatePath("/dashboard/technician/services");
  return { success: true };
}

export async function upsertAvailability(formData: FormData) {
  const { profile } = await getTechnicianProfile();

  const raw = Object.fromEntries(formData.entries());
  const result = availabilitySchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { dayOfWeek, startTime, endTime, enabled } = result.data;

  // Delete existing slot for this day
  await prisma.availabilitySlot.deleteMany({
    where: { technicianId: profile.id, dayOfWeek },
  });

  // Create if enabled
  if (enabled) {
    await prisma.availabilitySlot.create({
      data: {
        technicianId: profile.id,
        dayOfWeek,
        startTime,
        endTime,
      },
    });
  }

  revalidatePath("/dashboard/technician/availability");
  return { success: true };
}

"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const technicianSignupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  yearsExperience: z.coerce.number().int().min(0).optional(),
  bio: z.string().max(1000).optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required").max(2),
  zipCode: z.string().optional(),
  serviceRadius: z.coerce.number().int().min(1).max(200).optional(),
  services: z.string().optional(), // comma-separated
  pianoTypes: z.string().optional(), // comma-separated
  baseTuningPrice: z.coerce.number().min(0).optional(),
  travelFee: z.coerce.number().min(0).optional(),
  pitchRaiseFee: z.coerce.number().min(0).optional(),
  ptgMember: z.string().optional(),
});

export async function createTechnicianProfile(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Please sign in first" };

  // Check if already a technician
  const existing = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (existing) return { error: "You already have a technician profile" };

  const raw = Object.fromEntries(formData.entries());
  const result = technicianSignupSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const data = result.data;
  const servicesArray = data.services
    ? data.services.split(",").filter(Boolean)
    : [];
  const pianoTypesArray = data.pianoTypes
    ? data.pianoTypes.split(",").filter(Boolean)
    : [];

  // Update user role and name
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: `${data.firstName} ${data.lastName}`,
      role: "TECHNICIAN",
      phone: data.phone || null,
    },
  });

  // Create technician profile
  const profile = await prisma.technicianProfile.create({
    data: {
      userId: session.user.id,
      bio: data.bio || null,
      yearsExperience: data.yearsExperience ?? null,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode || null,
      serviceRadius: data.serviceRadius ?? 25,
      pianoTypes: pianoTypesArray.length > 0 ? JSON.stringify(pianoTypesArray) : null,
      travelFeeCents: data.travelFee ? Math.round(data.travelFee * 100) : null,
      ptgMember: data.ptgMember === "true",
    },
  });

  // Create default services from pricing
  if (data.baseTuningPrice && data.baseTuningPrice > 0) {
    await prisma.service.create({
      data: {
        technicianId: profile.id,
        name: "Standard Tuning",
        description: "Full piano tuning to A440 concert pitch",
        priceCents: Math.round(data.baseTuningPrice * 100),
        durationMin: 90,
      },
    });
  }

  if (data.pitchRaiseFee && data.pitchRaiseFee > 0) {
    await prisma.service.create({
      data: {
        technicianId: profile.id,
        name: "Pitch Raise",
        description: "For pianos significantly below pitch, includes follow-up tuning",
        priceCents: Math.round(data.pitchRaiseFee * 100),
        durationMin: 120,
      },
    });
  }

  // Create services for each selected service type (with placeholder pricing)
  const serviceDefaults: Record<string, { desc: string; dur: number }> = {
    Repair: { desc: "Piano repair services", dur: 60 },
    Regulation: { desc: "Action regulation for optimal touch and response", dur: 180 },
    Voicing: { desc: "Hammer voicing for tonal quality", dur: 120 },
    Appraisal: { desc: "Professional piano appraisal", dur: 60 },
    "Humidity System": { desc: "Dampp-Chaser or humidity control system installation", dur: 120 },
  };

  for (const svc of servicesArray) {
    if (svc === "Tuning") continue; // already created above
    const defaults = serviceDefaults[svc];
    if (defaults) {
      await prisma.service.create({
        data: {
          technicianId: profile.id,
          name: svc,
          description: defaults.desc,
          priceCents: 0, // technician sets price later
          durationMin: defaults.dur,
        },
      });
    }
  }

  return { success: true };
}

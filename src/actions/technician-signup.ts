"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCents } from "@/lib/utils";
import { geocode } from "@/lib/geocoding";
import { ROLES } from "@/lib/constants";
import { technicianSignupSchema } from "@/lib/validations/technician";

const SERVICE_DEFAULTS: Record<string, { desc: string; dur: number }> = {
  Repair: { desc: "Piano repair services", dur: 60 },
  Regulation: { desc: "Action regulation for optimal touch and response", dur: 180 },
  Voicing: { desc: "Hammer voicing for tonal quality", dur: 120 },
  Appraisal: { desc: "Professional piano appraisal", dur: 60 },
  "Humidity System": { desc: "Dampp-Chaser or humidity control system installation", dur: 120 },
};

export async function createTechnicianProfile(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Please sign in first" };

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

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: `${data.firstName} ${data.lastName}`,
      role: ROLES.TECHNICIAN,
      phone: data.phone || null,
    },
  });

  let latitude: number | null = null;
  let longitude: number | null = null;
  const geo = await geocode(`${data.city}, ${data.state} ${data.zipCode || ""}`);
  if (geo) {
    latitude = geo.lat;
    longitude = geo.lng;
  }

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
      travelFeeCents: data.travelFee ? toCents(data.travelFee) : null,
      ptgMember: data.ptgMember === "true",
      latitude,
      longitude,
    },
  });

  // Batch all service creates
  const servicesToCreate: {
    technicianId: string;
    name: string;
    description: string;
    priceCents: number;
    durationMin: number;
  }[] = [];

  if (data.baseTuningPrice && data.baseTuningPrice > 0) {
    servicesToCreate.push({
      technicianId: profile.id,
      name: "Standard Tuning",
      description: "Full piano tuning to A440 concert pitch",
      priceCents: toCents(data.baseTuningPrice),
      durationMin: 90,
    });
  }

  if (data.pitchRaiseFee && data.pitchRaiseFee > 0) {
    servicesToCreate.push({
      technicianId: profile.id,
      name: "Pitch Raise",
      description: "For pianos significantly below pitch, includes follow-up tuning",
      priceCents: toCents(data.pitchRaiseFee),
      durationMin: 120,
    });
  }

  for (const svc of servicesArray) {
    if (svc === "Tuning") continue;
    const defaults = SERVICE_DEFAULTS[svc];
    if (defaults) {
      servicesToCreate.push({
        technicianId: profile.id,
        name: svc,
        description: defaults.desc,
        priceCents: 0,
        durationMin: defaults.dur,
      });
    }
  }

  if (servicesToCreate.length > 0) {
    await prisma.service.createMany({ data: servicesToCreate });
  }

  revalidatePath("/search");
  return { success: true };
}

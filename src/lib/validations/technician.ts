import { z } from "zod";

export const profileSchema = z.object({
  bio: z.string().max(1000).optional(),
  businessName: z.string().max(100).optional(),
  yearsExperience: z.coerce.number().int().min(0).max(100).optional(),
  certifications: z.string().optional(),
  serviceRadius: z.coerce.number().int().min(1).max(200).optional(),
  // Blank string must mean "unchanged", not 0 (Number("") === 0)
  travelBufferMin: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(0).max(240).optional()
  ),
  addressLine1: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(2).optional(),
  zipCode: z.string().max(10).optional(),
  phone: z.string().max(20).optional(),
});

export const serviceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  price: z.coerce.number().min(0.01, "Price must be positive"),
  durationMin: z.coerce.number().int().min(15).max(480),
});

export const availabilitySchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm format"),
  enabled: z.coerce.boolean(),
});

export const technicianSignupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  yearsExperience: z.coerce.number().int().min(0).optional(),
  bio: z.string().max(1000).optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required").max(2),
  zipCode: z.string().optional(),
  serviceRadius: z.coerce.number().int().min(1).max(200).optional(),
  services: z.string().optional(),
  pianoTypes: z.string().optional(),
  baseTuningPrice: z.coerce.number().min(0).optional(),
  travelFee: z.coerce.number().min(0).optional(),
  pitchRaiseFee: z.coerce.number().min(0).optional(),
  ptgMember: z.string().optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
export type TechnicianSignupInput = z.infer<typeof technicianSignupSchema>;

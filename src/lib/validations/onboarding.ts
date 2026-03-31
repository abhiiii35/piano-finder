import { z } from "zod";

export const wizardProfileSchema = z.object({
  bio: z.string().min(10, "Bio must be at least 10 characters").max(1000),
  businessName: z.string().max(100).optional(),
  yearsExperience: z.coerce.number().int().min(0).max(100),
});

export type WizardProfileInput = z.infer<typeof wizardProfileSchema>;

import { z } from "zod";

// HTML checkboxes submit "on" when checked and nothing when unchecked (see expense.ts).
const checkbox = z
  .string()
  .optional()
  .transform((value) => value === "on" || value === "true");

export const serviceLocationSchema = z.object({
  label: z.string().min(1, "Label is required"),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  isPrimary: checkbox,
});

export type ServiceLocationInput = z.infer<typeof serviceLocationSchema>;

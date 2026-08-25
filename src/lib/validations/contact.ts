import { z } from "zod";

// HTML checkboxes submit "on" when checked and nothing when unchecked (see expense.ts).
const checkbox = z
  .string()
  .optional()
  .transform((value) => value === "on" || value === "true");

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  role: z.string().optional(),
  isPrimary: checkbox,
});

export type ContactInput = z.infer<typeof contactSchema>;

import { z } from "zod";

// HTML checkboxes submit "on" when checked and nothing when unchecked (see expense.ts).
const checkbox = z
  .string()
  .optional()
  .transform((value) => value === "on" || value === "true");

const optionalYear = z
  .string()
  .optional()
  .transform((value) => (value && value.trim() ? Number(value) : undefined))
  .refine(
    (value) =>
      value === undefined ||
      (Number.isInteger(value) && value >= 1800 && value <= 2100),
    { message: "Year must be between 1800 and 2100" }
  );

const tuningFrequencyMonths = z
  .string()
  .optional()
  .transform((value) => (value && value.trim() ? Number(value) : 6))
  .refine((value) => Number.isInteger(value) && value > 0 && value <= 60, {
    message: "Tuning frequency must be between 1 and 60 months",
  });

export const pianoSchema = z.object({
  type: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  year: optionalYear,
  roomLocation: z.string().optional(),
  serviceLocationId: z.string().optional(),
  tuningFrequencyMonths,
  damppChaserInstalled: checkbox,
  notes: z.string().optional(),
});

export type PianoInput = z.infer<typeof pianoSchema>;

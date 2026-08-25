import { z } from "zod";

// Same local-date convention as expense.ts's dateString: "yyyy-mm-dd" parsed
// as a local midnight Date, never new Date(string) (UTC parsing bug).
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
  .transform((value, ctx) => {
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      ctx.addIssue({ code: "custom", message: "Invalid date" });
      return z.NEVER;
    }
    return date;
  })
  .refine((date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date.getTime() <= today.getTime();
  }, "Date cannot be in the future");

// HTML checkboxes submit "on" when checked and nothing when unchecked (see expense.ts/piano.ts).
const checkbox = z
  .string()
  .optional()
  .transform((value) => value === "on" || value === "true");

function optionalNumberInRange(min: number, max: number, label: string) {
  return z
    .string()
    .optional()
    .transform((value) => (value && value.trim() !== "" ? Number(value) : undefined))
    .refine(
      (value) => value === undefined || (!Number.isNaN(value) && value >= min && value <= max),
      { message: `${label} must be between ${min} and ${max}` }
    );
}

const photosJson = z
  .string()
  .optional()
  .transform((value) => {
    if (!value) return [] as string[];
    try {
      const arr = JSON.parse(value);
      return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [] as string[];
    }
  });

export const serviceRecordSchema = z.object({
  date: dateString,
  workPerformed: z.string().optional(),
  pitchOffsetCents: optionalNumberInRange(-200, 200, "Pitch offset"),
  humidityPct: optionalNumberInRange(0, 100, "Humidity"),
  temperatureF: optionalNumberInRange(20, 120, "Temperature"),
  recommendations: z.string().optional(),
  notes: z.string().optional(),
  photosJson,
  // Inverted so the default (checkbox absent = false) means visible.
  hideFromClient: checkbox,
});

export type ServiceRecordInput = z.infer<typeof serviceRecordSchema>;

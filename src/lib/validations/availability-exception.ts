import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date as yyyy-mm-dd");
const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a time as HH:mm");

// All-day blocks may span multiple days (endDate inclusive); timed blocks are single-day.
export const availabilityExceptionSchema = z
  .object({
    date: dateString,
    allDay: z.boolean(),
    endDate: dateString.optional(),
    startTime: timeString.optional(),
    endTime: timeString.optional(),
    reason: z.string().max(100, "Keep the label under 100 characters").optional(),
  })
  .refine((v) => v.allDay || (v.startTime && v.endTime), {
    message: "Choose a start and end time, or mark the whole day off",
    path: ["startTime"],
  })
  .refine((v) => v.allDay || !v.endDate, {
    message: "Timed blocks cover a single day",
    path: ["endDate"],
  })
  .refine((v) => v.allDay || (v.startTime ?? "") < (v.endTime ?? ""), {
    message: "End time must be after the start time",
    path: ["endTime"],
  })
  .refine((v) => !v.endDate || v.endDate >= v.date, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

export type AvailabilityExceptionInput = z.infer<
  typeof availabilityExceptionSchema
>;

import { z } from "zod";

export const bookingSchema = z.object({
  technicianId: z.string().min(1),
  serviceIds: z.array(z.string()).min(1, "Select at least one service"),
  scheduledAt: z.string().min(1, "Select a date and time"),
  addressLine1: z.string().min(1, "Address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "Zip code is required"),
  pianoType: z.string().optional(),
  pianoMake: z.string().optional(),
  pianoModel: z.string().optional(),
  notes: z.string().optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;

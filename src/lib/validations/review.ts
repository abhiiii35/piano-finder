import { z } from "zod";

export const reviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  photos: z.array(z.string().url()).max(10).default([]),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

import { z } from "zod";

export const jobSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  serviceType: z.string().min(1, "Service type is required"),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000),
  budget: z.coerce.number().min(1, "Budget must be at least $1"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required").max(2),
});

export type JobInput = z.infer<typeof jobSchema>;

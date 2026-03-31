import { z } from "zod";

export const messageSchema = z.object({
  threadId: z.string().min(1),
  content: z.string().min(1, "Message cannot be empty").max(2000),
  bookingId: z.string().optional(),
  technicianId: z.string().min(1),
});

export type MessageInput = z.infer<typeof messageSchema>;

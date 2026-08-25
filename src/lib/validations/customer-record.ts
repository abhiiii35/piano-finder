import { z } from "zod";

export const customerRecordSchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerPhone: z.string().optional(),
  pianoMake: z.string().optional(),
  pianoModel: z.string().optional(),
  serialNumber: z.string().optional(),
  pianoLocation: z.string().optional(),
  notes: z.string().optional(),
  billingAddressLine1: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingZip: z.string().optional(),
});

export type CustomerRecordInput = z.infer<typeof customerRecordSchema>;

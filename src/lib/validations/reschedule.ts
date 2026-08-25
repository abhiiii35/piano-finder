import { z } from "zod";

export const rescheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Select a time"),
});

export const proposeTimesSchema = z.object({
  slots: z
    .array(z.string().min(1))
    .min(2, "Offer at least 2 times")
    .max(4, "Offer at most 4 times"),
});

export const acceptProposalSchema = z.object({
  token: z.string().min(1),
  slotIso: z.string().min(1),
});

export type RescheduleInput = z.infer<typeof rescheduleSchema>;
export type ProposeTimesInput = z.infer<typeof proposeTimesSchema>;

// Shared "is this still actionable" check for a reschedule proposal —
// factored out (rather than inlined at each call site) so Date.now() isn't
// called directly inside a component's render body.
export function isProposalPending(proposal: { status: string; expiresAt: Date }): boolean {
  return proposal.status === "PENDING" && proposal.expiresAt.getTime() >= Date.now();
}

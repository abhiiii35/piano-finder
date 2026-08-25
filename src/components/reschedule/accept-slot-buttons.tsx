"use client";

import { useState } from "react";
import { format } from "date-fns";
import { acceptRescheduleProposal } from "@/actions/reschedule";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check } from "lucide-react";

export function AcceptSlotButtons({ token, slots }: { token: string; slots: string[] }) {
  const [loadingSlot, setLoadingSlot] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);

  async function handlePick(slotIso: string) {
    setLoadingSlot(slotIso);
    const result = await acceptRescheduleProposal(token, slotIso);
    setLoadingSlot(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      setConfirmed(slotIso);
      toast.success("Appointment confirmed");
    }
  }

  if (confirmed) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary p-4 text-sm">
        <Check className="h-4 w-4 shrink-0" />
        <span>
          You&apos;re booked for {format(new Date(confirmed), "MMMM d, yyyy 'at' h:mm a")}. A
          confirmation has been sent to your email.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {slots.map((slot) => (
        <Button
          key={slot}
          variant="outline"
          className="w-full justify-start"
          disabled={loadingSlot !== null}
          onClick={() => handlePick(slot)}
        >
          {loadingSlot === slot ? "Booking..." : format(new Date(slot), "MMMM d, yyyy 'at' h:mm a")}
        </Button>
      ))}
    </div>
  );
}

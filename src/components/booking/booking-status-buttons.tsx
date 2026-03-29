"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateBookingStatus } from "@/actions/booking";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const technicianActions: Record<string, { label: string; status: string; variant: "default" | "outline" | "destructive" }[]> = {
  PENDING: [
    { label: "Confirm", status: "CONFIRMED", variant: "default" },
    { label: "Cancel", status: "CANCELLED", variant: "destructive" },
  ],
  CONFIRMED: [
    { label: "Start Service", status: "IN_PROGRESS", variant: "default" },
    { label: "Cancel", status: "CANCELLED", variant: "destructive" },
  ],
  IN_PROGRESS: [
    { label: "Mark Complete", status: "COMPLETED", variant: "default" },
  ],
};

const customerActions: Record<string, { label: string; status: string; variant: "default" | "outline" | "destructive" }[]> = {
  PENDING: [{ label: "Cancel Booking", status: "CANCELLED", variant: "destructive" }],
  CONFIRMED: [{ label: "Cancel Booking", status: "CANCELLED", variant: "destructive" }],
};

export function BookingStatusButtons({
  bookingId,
  currentStatus,
  role,
}: {
  bookingId: string;
  currentStatus: string;
  role: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const actions =
    role === "TECHNICIAN"
      ? technicianActions[currentStatus]
      : customerActions[currentStatus];

  if (!actions || actions.length === 0) return null;

  async function handleAction(newStatus: string) {
    setLoading(true);
    const result = await updateBookingStatus(bookingId, newStatus);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Booking updated");
      router.refresh();
    }
  }

  return (
    <div className="flex gap-3">
      {actions.map((action) => (
        <Button
          key={action.status}
          variant={action.variant}
          onClick={() => handleAction(action.status)}
          disabled={loading}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateBookingStatus } from "@/actions/booking";
import { Button } from "@/components/ui/button";
import { RescheduleDialog } from "@/components/booking/reschedule-dialog";
import { ProposeTimesDialog } from "@/components/booking/propose-times-dialog";
import { toast } from "sonner";

const RESCHEDULABLE_STATUSES = ["PENDING", "CONFIRMED"];

// Factored out of the component body so Date.now() isn't called directly
// inside render.
function isInsideCutoff(scheduledAt: string | Date, cutoffHours: number): boolean {
  return Date.now() >= new Date(scheduledAt).getTime() - cutoffHours * 60 * 60 * 1000;
}

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
  technicianId,
  durationMin,
  scheduledAt,
  rescheduleCutoffHours,
  proposeTimesEnabled,
}: {
  bookingId: string;
  currentStatus: string;
  role: string;
  // Needed for the reschedule/offer-times dialogs. Omit to hide those
  // controls (e.g. from a context that doesn't have this data).
  technicianId?: string;
  durationMin?: number;
  scheduledAt?: string | Date;
  rescheduleCutoffHours?: number;
  proposeTimesEnabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const actions =
    role === "TECHNICIAN"
      ? technicianActions[currentStatus]
      : customerActions[currentStatus];

  const canReschedule =
    RESCHEDULABLE_STATUSES.includes(currentStatus) &&
    !!technicianId &&
    durationMin != null;

  if ((!actions || actions.length === 0) && !canReschedule) return null;

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

  const insideCutoff =
    role === "CUSTOMER" &&
    scheduledAt != null &&
    rescheduleCutoffHours != null &&
    isInsideCutoff(scheduledAt, rescheduleCutoffHours);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {actions?.map((action) => (
        <Button
          key={action.status}
          variant={action.variant}
          onClick={() => handleAction(action.status)}
          disabled={loading}
        >
          {action.label}
        </Button>
      ))}
      {canReschedule && technicianId && durationMin != null && (
        role === "TECHNICIAN" || !insideCutoff ? (
          <RescheduleDialog
            bookingId={bookingId}
            technicianId={technicianId}
            durationMin={durationMin}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Rescheduling online closes {rescheduleCutoffHours} hours before your
            appointment. Message your technician to change this booking.
          </p>
        )
      )}
      {role === "TECHNICIAN" && canReschedule && proposeTimesEnabled && technicianId && durationMin != null && (
        <ProposeTimesDialog
          bookingId={bookingId}
          technicianId={technicianId}
          durationMin={durationMin}
        />
      )}
    </div>
  );
}

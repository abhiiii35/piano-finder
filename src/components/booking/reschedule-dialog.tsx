"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { getAvailableSlots } from "@/actions/booking";
import { rescheduleBooking } from "@/actions/reschedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function RescheduleDialog({
  bookingId,
  technicianId,
  durationMin,
  triggerLabel = "Reschedule",
}: {
  bookingId: string;
  technicianId: string;
  durationMin: number;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !date) return;
    getAvailableSlots(technicianId, date, durationMin).then((s) => {
      setSlots(s);
      setTime((t) => (t && !s.includes(t) ? "" : t));
    });
  }, [open, date, technicianId, durationMin]);

  async function handleConfirm() {
    setLoading(true);
    const result = await rescheduleBooking(bookingId, date, time);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Appointment rescheduled");
      setOpen(false);
      setDate("");
      setTime("");
      router.refresh();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setDate("");
          setTime("");
          setSlots([]);
        }
      }}
    >
      <DialogTrigger>
        <Button variant="outline" onClick={() => setOpen(true)}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pick a New Time</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reschedule-date">Date</Label>
            <Input
              id="reschedule-date"
              type="date"
              value={date}
              min={format(new Date(), "yyyy-MM-dd")}
              onChange={(e) => {
                setDate(e.target.value);
                setTime("");
                setSlots([]);
              }}
            />
          </div>
          {date && slots.length > 0 && (
            <div className="space-y-2">
              <Label>Available Times</Label>
              <div className="grid grid-cols-4 gap-2">
                {slots.map((slot) => (
                  <Button
                    key={slot}
                    type="button"
                    size="sm"
                    variant={time === slot ? "default" : "outline"}
                    onClick={() => setTime(slot)}
                  >
                    {slot}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {date && slots.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No available times on this day.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleConfirm} disabled={!date || !time || loading}>
            {loading ? "Saving..." : "Confirm New Time"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

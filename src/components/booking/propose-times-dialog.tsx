"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { getAvailableSlots } from "@/actions/booking";
import { proposeRescheduleTimes } from "@/actions/reschedule";
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
import { Plus, X } from "lucide-react";

type SlotPick = { date: string; time: string };

const MIN_SLOTS = 2;
const MAX_SLOTS = 4;

function SlotRow({
  pick,
  technicianId,
  durationMin,
  onChange,
  onRemove,
  removable,
}: {
  pick: SlotPick;
  technicianId: string;
  durationMin: number;
  onChange: (pick: SlotPick) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  const [slots, setSlots] = useState<string[]>([]);

  useEffect(() => {
    if (!pick.date) return;
    getAvailableSlots(technicianId, pick.date, durationMin).then(setSlots);
  }, [pick.date, technicianId, durationMin]);

  function handleDateChange(newDate: string) {
    setSlots([]);
    onChange({ date: newDate, time: "" });
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-2">
          <Label>Date</Label>
          <Input
            type="date"
            value={pick.date}
            min={format(new Date(), "yyyy-MM-dd")}
            onChange={(e) => handleDateChange(e.target.value)}
          />
        </div>
        {removable && (
          <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label="Remove this time">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {pick.date && slots.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {slots.map((slot) => (
            <Button
              key={slot}
              type="button"
              size="sm"
              variant={pick.time === slot ? "default" : "outline"}
              onClick={() => onChange({ ...pick, time: slot })}
            >
              {slot}
            </Button>
          ))}
        </div>
      )}
      {pick.date && slots.length === 0 && (
        <p className="text-sm text-muted-foreground">No available times on this day.</p>
      )}
    </div>
  );
}

export function ProposeTimesDialog({
  bookingId,
  technicianId,
  durationMin,
}: {
  bookingId: string;
  technicianId: string;
  durationMin: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [picks, setPicks] = useState<SlotPick[]>([
    { date: "", time: "" },
    { date: "", time: "" },
  ]);
  const [loading, setLoading] = useState(false);

  const filled = picks.filter((p) => p.date && p.time);
  const canSubmit = filled.length >= MIN_SLOTS && filled.length === picks.length;

  function updatePick(index: number, pick: SlotPick) {
    setPicks((prev) => prev.map((p, i) => (i === index ? pick : p)));
  }

  function removePick(index: number) {
    setPicks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setLoading(true);
    const isoSlots = filled.map((p) => `${p.date}T${p.time}:00`);
    const result = await proposeRescheduleTimes(bookingId, isoSlots);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Times sent to your client");
      setOpen(false);
      setPicks([{ date: "", time: "" }, { date: "", time: "" }]);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button variant="outline" onClick={() => setOpen(true)}>
          Offer times to client
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Offer New Times</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Pick 2 to 4 times. Your client will get an email with a link to choose one.
          </p>
          {picks.map((pick, i) => (
            <SlotRow
              key={i}
              pick={pick}
              technicianId={technicianId}
              durationMin={durationMin}
              onChange={(p) => updatePick(i, p)}
              onRemove={() => removePick(i)}
              removable={picks.length > MIN_SLOTS}
            />
          ))}
          {picks.length < MAX_SLOTS && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPicks((prev) => [...prev, { date: "", time: "" }])}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add another time
            </Button>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!canSubmit || loading}>
            {loading ? "Sending..." : "Send Times"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

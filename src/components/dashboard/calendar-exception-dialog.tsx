"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createAvailabilityException,
  deleteAvailabilityException,
} from "@/actions/availability-exception";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { buildExceptionInput, formatExceptionSpan, type CalendarException } from "./calendar-utils";

export type ExceptionDialogState =
  | { mode: "create"; date: string; startTime?: string }
  | { mode: "view"; exception: CalendarException };

export function CalendarExceptionDialog({
  state,
  onClose,
}: {
  state: ExceptionDialogState | null;
  onClose: () => void;
}) {
  // Keying the body by the dialog's identity gives each create/view session a
  // fresh mount — form fields seed from `state` via lazy useState instead of
  // an effect that would otherwise setState-on-open.
  const key = state ? dialogKey(state) : "closed";

  return (
    <Dialog open={!!state} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {state && <ExceptionDialogBody key={key} state={state} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function dialogKey(state: ExceptionDialogState): string {
  return state.mode === "create" ? `create-${state.date}-${state.startTime ?? "allday"}` : `view-${state.exception.id}`;
}

function ExceptionDialogBody({
  state,
  onClose,
}: {
  state: ExceptionDialogState;
  onClose: () => void;
}) {
  const router = useRouter();
  const [allDay, setAllDay] = useState(() => (state.mode === "create" ? !state.startTime : true));
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState(() =>
    state.mode === "create" ? (state.startTime ?? "09:00") : "09:00"
  );
  const [endTime, setEndTime] = useState("17:00");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (state.mode !== "create") return;
    setSaving(true);
    const result = await createAvailabilityException(
      buildExceptionInput({ date: state.date, allDay, endDate, startTime, endTime, reason })
    );
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Time off added");
    router.refresh();
    onClose();
  }

  async function handleDelete() {
    if (state.mode !== "view") return;
    setSaving(true);
    const result = await deleteAvailabilityException(state.exception.id);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Time off removed");
    router.refresh();
    onClose();
  }

  if (state.mode === "view") {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{state.exception.reason || "Unavailable"}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{formatExceptionSpan(state.exception)}</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Close
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={saving}>
            {saving ? "Removing..." : "Delete"}
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Block time off</DialogTitle>
      </DialogHeader>
      <div className="grid gap-3">
        <div className="flex items-center gap-2">
          <Switch checked={allDay} onCheckedChange={(c) => setAllDay(!!c)} />
          <Label>All day</Label>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="exc-date">Date</Label>
          <Input id="exc-date" type="date" value={state.date} disabled />
        </div>
        {allDay ? (
          <div className="grid gap-2">
            <Label htmlFor="exc-end-date">Through (optional)</Label>
            <Input
              id="exc-end-date"
              type="date"
              min={state.date}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="flex-1 grid gap-2">
              <Label htmlFor="exc-start">Start</Label>
              <Input
                id="exc-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="flex-1 grid gap-2">
              <Label htmlFor="exc-end">End</Label>
              <Input
                id="exc-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="exc-reason">Label (optional)</Label>
          <Input
            id="exc-reason"
            placeholder="Vacation"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleCreate} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { upsertAvailability } from "@/actions/technician";
import {
  createAvailabilityException,
  deleteAvailabilityException,
  listAvailabilityExceptions,
} from "@/actions/availability-exception";
import {
  getCalendarFeedStatus,
  enableCalendarFeed,
  regenerateCalendarFeed,
  disableCalendarFeed,
} from "@/actions/calendar-feed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type Exception = Awaited<ReturnType<typeof listAvailabilityExceptions>>[number];

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type Slot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  enabled: boolean;
};

export default function AvailabilityPage() {
  const [slots, setSlots] = useState<Slot[]>(
    DAYS.map((_, i) => ({
      dayOfWeek: i,
      startTime: "09:00",
      endTime: "17:00",
      enabled: false,
    }))
  );
  const [saving, setSaving] = useState<number | null>(null);

  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loadingExceptions, setLoadingExceptions] = useState(true);
  const [timeOffForm, setTimeOffForm] = useState({
    date: "",
    allDay: true,
    endDate: "",
    startTime: "09:00",
    endTime: "17:00",
    reason: "",
  });
  const [addingTimeOff, setAddingTimeOff] = useState(false);

  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarBusy, setCalendarBusy] = useState(false);

  useEffect(() => {
    getCalendarFeedStatus()
      .then((result) => {
        if ("calendarToken" in result) setCalendarToken(result.calendarToken ?? null);
      })
      .finally(() => setCalendarLoading(false));
  }, []);

  function calendarUrl(token: string): string {
    return `${window.location.origin}/api/calendar/${token}`;
  }

  async function handleEnableCalendar() {
    setCalendarBusy(true);
    const result = await enableCalendarFeed();
    setCalendarBusy(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setCalendarToken(result.calendarToken);
    toast.success("Calendar feed enabled");
  }

  async function handleCopyCalendarUrl() {
    if (!calendarToken) return;
    await navigator.clipboard.writeText(calendarUrl(calendarToken));
    toast.success("Link copied");
  }

  async function handleRegenerateCalendar() {
    setCalendarBusy(true);
    const result = await regenerateCalendarFeed();
    setCalendarBusy(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setCalendarToken(result.calendarToken);
    toast.success("Link regenerated — the old link no longer works");
  }

  async function handleDisableCalendar() {
    setCalendarBusy(true);
    const result = await disableCalendarFeed();
    setCalendarBusy(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setCalendarToken(null);
    toast.success("Calendar feed disabled");
  }

  useEffect(() => {
    fetch("/api/technician/availability")
      .then((r) => r.json())
      .then((data) => {
        if (data.slots) {
          setSlots((prev) =>
            prev.map((s) => {
              const existing = data.slots.find(
                (sl: { dayOfWeek: number }) => sl.dayOfWeek === s.dayOfWeek
              );
              return existing
                ? { ...s, ...existing, enabled: true }
                : s;
            })
          );
        }
      });
  }, []);

  useEffect(() => {
    listAvailabilityExceptions()
      .then((data) => setExceptions(data))
      .finally(() => setLoadingExceptions(false));
  }, []);

  async function handleAddTimeOff(e: React.FormEvent) {
    e.preventDefault();
    if (!timeOffForm.date) {
      toast.error("Choose a date");
      return;
    }
    setAddingTimeOff(true);
    const result = await createAvailabilityException({
      date: timeOffForm.date,
      allDay: timeOffForm.allDay,
      endDate:
        timeOffForm.allDay && timeOffForm.endDate
          ? timeOffForm.endDate
          : undefined,
      startTime: timeOffForm.allDay ? undefined : timeOffForm.startTime,
      endTime: timeOffForm.allDay ? undefined : timeOffForm.endTime,
      reason: timeOffForm.reason || undefined,
    });
    setAddingTimeOff(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Time off added");
    setTimeOffForm({
      date: "",
      allDay: true,
      endDate: "",
      startTime: "09:00",
      endTime: "17:00",
      reason: "",
    });
    setExceptions(await listAvailabilityExceptions());
  }

  async function handleDeleteException(id: string) {
    const result = await deleteAvailabilityException(id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setExceptions((prev) => prev.filter((ex) => ex.id !== id));
    toast.success("Time off removed");
  }

  function formatExceptionDate(ex: Exception): string {
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    const start = new Date(ex.startsAt);
    if (!ex.allDay) return fmt(start);
    // all-day endsAt is exclusive midnight-after-the-last-day
    const lastDay = new Date(new Date(ex.endsAt).getTime() - 1);
    if (start.toDateString() === lastDay.toDateString()) return fmt(start);
    return `${fmt(start)} – ${fmt(lastDay)}`;
  }

  function formatExceptionTime(ex: Exception): string {
    if (ex.allDay) return "All day";
    const fmt = (d: Date) =>
      d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${fmt(new Date(ex.startsAt))} – ${fmt(new Date(ex.endsAt))}`;
  }

  async function handleSave(slot: Slot) {
    setSaving(slot.dayOfWeek);
    const formData = new FormData();
    formData.set("dayOfWeek", String(slot.dayOfWeek));
    formData.set("startTime", slot.startTime);
    formData.set("endTime", slot.endTime);
    formData.set("enabled", String(slot.enabled));

    const result = await upsertAvailability(formData);
    setSaving(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${DAYS[slot.dayOfWeek]} updated`);
    }
  }

  function updateSlot(index: number, updates: Partial<Slot>) {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Availability</h1>
      <p className="mt-1 text-muted-foreground">
        Set your weekly availability for bookings
      </p>

      <div className="mt-8 space-y-4">
        {slots.map((slot, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 p-4">
              <Switch
                checked={slot.enabled}
                onCheckedChange={(checked) =>
                  updateSlot(i, { enabled: !!checked })
                }
              />
              <span className="w-28 font-medium">{DAYS[i]}</span>
              {slot.enabled ? (
                <>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`start-${i}`} className="sr-only">
                      Start
                    </Label>
                    <Input
                      id={`start-${i}`}
                      type="time"
                      value={slot.startTime}
                      onChange={(e) =>
                        updateSlot(i, { startTime: e.target.value })
                      }
                      className="w-32"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Label htmlFor={`end-${i}`} className="sr-only">
                      End
                    </Label>
                    <Input
                      id={`end-${i}`}
                      type="time"
                      value={slot.endTime}
                      onChange={(e) =>
                        updateSlot(i, { endTime: e.target.value })
                      }
                      className="w-32"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSave(slot)}
                    disabled={saving === slot.dayOfWeek}
                  >
                    {saving === slot.dayOfWeek ? "Saving..." : "Save"}
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground">
                    Not available
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSave(slot)}
                    disabled={saving === slot.dayOfWeek}
                  >
                    Save
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-bold">Time off</h2>
        <p className="mt-1 text-muted-foreground">
          Block dates or hours when you can&apos;t take bookings
        </p>

        <div className="mt-4 space-y-3">
          {loadingExceptions ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : exceptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No upcoming time off
            </p>
          ) : (
            exceptions.map((ex) => (
              <Card key={ex.id}>
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-medium">{ex.reason || "Time off"}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatExceptionDate(ex)} · {formatExceptionTime(ex)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteException(ex.id)}
                  >
                    Delete
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Card className="mt-4">
          <CardContent className="p-4">
            <form onSubmit={handleAddTimeOff} className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={timeOffForm.allDay}
                  onCheckedChange={(checked) =>
                    setTimeOffForm((f) => ({ ...f, allDay: !!checked }))
                  }
                />
                <span className="text-sm font-medium">All day</span>
              </div>

              <div className="flex flex-wrap items-end gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="timeoff-date">
                    {timeOffForm.allDay ? "Start date" : "Date"}
                  </Label>
                  <Input
                    id="timeoff-date"
                    type="date"
                    value={timeOffForm.date}
                    onChange={(e) =>
                      setTimeOffForm((f) => ({ ...f, date: e.target.value }))
                    }
                    className="w-40"
                  />
                </div>

                {timeOffForm.allDay && (
                  <div className="grid gap-2">
                    <Label htmlFor="timeoff-end-date">
                      End date (optional)
                    </Label>
                    <Input
                      id="timeoff-end-date"
                      type="date"
                      value={timeOffForm.endDate}
                      onChange={(e) =>
                        setTimeOffForm((f) => ({
                          ...f,
                          endDate: e.target.value,
                        }))
                      }
                      className="w-40"
                    />
                  </div>
                )}

                {!timeOffForm.allDay && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="timeoff-start">Start time</Label>
                      <Input
                        id="timeoff-start"
                        type="time"
                        value={timeOffForm.startTime}
                        onChange={(e) =>
                          setTimeOffForm((f) => ({
                            ...f,
                            startTime: e.target.value,
                          }))
                        }
                        className="w-32"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="timeoff-end">End time</Label>
                      <Input
                        id="timeoff-end"
                        type="time"
                        value={timeOffForm.endTime}
                        onChange={(e) =>
                          setTimeOffForm((f) => ({
                            ...f,
                            endTime: e.target.value,
                          }))
                        }
                        className="w-32"
                      />
                    </div>
                  </>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="timeoff-reason">Label (optional)</Label>
                  <Input
                    id="timeoff-reason"
                    value={timeOffForm.reason}
                    onChange={(e) =>
                      setTimeOffForm((f) => ({
                        ...f,
                        reason: e.target.value,
                      }))
                    }
                    placeholder="Vacation"
                    className="w-48"
                  />
                </div>
              </div>

              <Button type="submit" disabled={addingTimeOff}>
                {addingTimeOff ? "Adding…" : "Add time off"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-bold">Calendar feed</h2>
        <p className="mt-1 text-muted-foreground">
          Subscribe from Google or Apple Calendar. Anyone with this link can
          see your appointments — regenerate it if it leaks.
        </p>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>{calendarToken ? "Feed enabled" : "Feed disabled"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {calendarLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : calendarToken ? (
              <>
                <Input
                  readOnly
                  value={calendarUrl(calendarToken)}
                  onFocus={(e) => e.target.select()}
                  className="font-mono text-xs"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyCalendarUrl}
                  >
                    Copy link
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRegenerateCalendar}
                    disabled={calendarBusy}
                  >
                    Regenerate link
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDisableCalendar}
                    disabled={calendarBusy}
                  >
                    Disable
                  </Button>
                </div>
              </>
            ) : (
              <Button onClick={handleEnableCalendar} disabled={calendarBusy}>
                Enable calendar feed
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
